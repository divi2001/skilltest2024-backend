
import mysql.connector

DB_CONFIG = {
    'host': '13.204.48.33',
    'port': 3306,
    'user': 'root',
    'password': 'tanuj1221',
    'database': 'dec25',
    'charset': 'utf8mb4'
}

def check_counts():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Consolidate all queries into one execution block for clarity
    queries = [
        ("Count rows in audiodb", "SELECT COUNT(*) FROM audiodb"),
        ("Count rows in subjectsdb", "SELECT COUNT(*) FROM subjectsdb"),
        ("Count after JOIN", "SELECT COUNT(*) FROM audiodb a LEFT JOIN subjectsdb s ON a.subjectId = s.subjectId"),
        ("Check duplicates in subjectsdb", "SELECT subjectId, COUNT(*) as c FROM subjectsdb GROUP BY subjectId HAVING c > 1")
    ]

    print(f"{'Description':<30} | {'Result'}")
    print("-" * 50)

    for description, query in queries:
        cursor.execute(query)
        result = cursor.fetchall()
        
        if description == "Check duplicates in subjectsdb":
            if result:
                print(f"{description:<30} | Found duplicates:")
                for row in result:
                    print(f"                               | SubjectID: {row[0]}, Count: {row[1]}")
            else:
                print(f"{description:<30} | No duplicates found")
        else:
            print(f"{description:<30} | {result[0][0]}")

    conn.close()

if __name__ == "__main__":
    check_counts()
