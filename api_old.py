from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import re
import difflib
from Levenshtein import distance as levenshtein_distance
import nltk
from nltk.tokenize import word_tokenize
from langdetect import detect
from difflib import SequenceMatcher

# Download the necessary resources
nltk.download('punkt')

app = Flask(__name__) CORS(app, supports_credentials=True, origins='*')

import re

def preprocess_text(text):
    # Convert to string and handle NaN/empty values
    text = str(text) if pd.notna(text) else ""
    
    # Remove all _x#### encodings
    text = re.sub(r'_x[0-9A-Fa-f]{4}_', '', text)
    text = re.sub(r'\u200c', '', text) 
    # Replace hyphens, periods, and other specified characters
    text = text.replace('-', '').replace('.', '').replace(',','').replace('$','').replace('#','').replace('"','').replace("'","").replace('|','').replace('Ã Â¥Â¤','').replace('\u200d','').replace('?','').replace('!','').replace(';','').replace(':','').replace('/','')
    
    # Remove extra spaces (replace two or more spaces with a single space)
    text = re.sub(r'\s{2,}', ' ', text)
    
    # Trim leading and trailing spaces
    text = text.strip()
    
    return text

def tokenize_text(text, language):
    if language in ['hi', 'mar']:
        # For Hindi and Marathi, split on whitespace and punctuation
        return re.findall(r'\S+', text)
    elif language == 'en':
        text = text.lower()
        return word_tokenize(text)
    else:
        return text.split()


def word_similarity(word1, word2):
    return SequenceMatcher(None, word1, word2).ratio()

def is_word(token):
    return bool(re.match(r'\S+', token))


def compare_texts(text1, text2, ignore_list):
    if text1 is None or text2 is None:
        return {'is_empty': True}

    text1 = preprocess_text(text1)
    text2 = preprocess_text(text2)

    ignore_list = [preprocess_text(word).lower() for word in ignore_list]

    try:
        language = detect(text1) if len(text1) > len(text2) else detect(text2)
    except:
        language = 'en'

    tokens1 = tokenize_text(text1, language)
    tokens2 = tokenize_text(text2, language)

    added = []
    missed = []
    spelling = []
    grammar = []
    colored_words = []

    # Create alignment matrix
    m, n = len(tokens1), len(tokens2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # Fill the matrix
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if tokens1[i-1].lower() == tokens2[j-1].lower():
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                similarity = word_similarity(tokens1[i-1].lower(), tokens2[j-1].lower())
                dp[i][j] = max(dp[i-1][j], dp[i][j-1], dp[i-1][j-1] + similarity)

    # Backtrack to find the alignment
    i, j = m, n
    alignment = []
    while i > 0 and j > 0:
        if tokens1[i-1].lower() == tokens2[j-1].lower():
            alignment.append(('match', tokens1[i-1], tokens2[j-1]))
            i -= 1
            j -= 1
        elif dp[i][j] == dp[i-1][j-1] + word_similarity(tokens1[i-1].lower(), tokens2[j-1].lower()):
            alignment.append(('similar', tokens1[i-1], tokens2[j-1]))
            i -= 1
            j -= 1
        elif dp[i][j] == dp[i-1][j]:
            alignment.append(('delete', tokens1[i-1], None))
            i -= 1
        else:
            alignment.append(('insert', None, tokens2[j-1]))
            j -= 1

    while i > 0:
        alignment.append(('delete', tokens1[i-1], None))
        i -= 1
    while j > 0:
        alignment.append(('insert', None, tokens2[j-1]))
        j -= 1

    alignment.reverse()
    # Process the alignment

    for op, word1, word2 in alignment:
        if op == 'match':
            colored_words.append({'word': word1, 'color': 'black'})
        elif op == 'similar':
            if word1.lower() in ignore_list or word2.lower() in ignore_list:
                colored_words.append({'word': word1, 'color': 'black'})
            else:
                distance = levenshtein_distance(word1, word2)
                max_length = max(len(word1), len(word2))
                similarity = (max_length - distance) / max_length * 100

                if similarity >= 40:  # You can adjust this threshold
                    colored_words.append({'word': word1, 'color': 'red'})
                    colored_words.append({'word': word2, 'color': 'green'})
                    spelling.append((word1, word2))
                else:
                    colored_words.append({'word': word1, 'color': 'red'})
                    colored_words.append({'word': word2, 'color': 'green'})
                    missed.append(word1)
                    added.append(word2)
        elif op == 'delete':
            if word1.lower() not in ignore_list:
                colored_words.append({'word': word1, 'color': 'red'})
                missed.append(word1)
        elif op == 'insert':
            if word2.lower() not in ignore_list:
                colored_words.append({'word': word2, 'color': 'green'})
                added.append(word2)
    return {
        'colored_words': colored_words,
        'missed': missed,
        'added': added,
        'spelling': spelling,
        'grammar': grammar
    }


@app.route('/compare', methods=['POST'])
def compare():
    data = request.json
    text1 = data.get('text1')
    text2 = data.get('text2')
    ignore_list = data.get('ignore_list')
    ignore_list = ignore_list + ['//1//','//2//','//3//','//4//','//5//','/','//','///']


    result = compare_texts(text1, text2, ignore_list)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

