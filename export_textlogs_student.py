import mysql.connector
import pandas as pd

conn = mysql.connector.connect(
    host="103.17.193.168",
    port=3306,
    user="root",
    password="tanuj1221",
    database="dec25"
)
cur = conn.cursor()

# Find internal student id from enrollment number
cur.execute("SELECT id, enrollment_no, name FROM students WHERE enrollment_no = '211151610010' LIMIT 1")
rows = cur.fetchall()
print("Student records:", rows)

if rows:
    student_id = rows[0][0]
    print(f"Internal student_id: {student_id}")

    cur2 = conn.cursor()
    cur2.execute(f"SELECT * FROM textlogs_history WHERE student_id = {student_id}")
    cols = [desc[0] for desc in cur2.description]
    data = cur2.fetchall()
    df = pd.DataFrame(data, columns=cols)
    print(f"Rows in textlogs_history: {len(df)}")

    output = r"C:\freelancer\kk exams software\skilltest2024-backend\textlogs_history_211151610010.xlsx"
    df.to_excel(output, index=False)
    print(f"Saved: {output}")
else:
    print("Student not found with enrollment_no=211151610010")
    cur.execute("SHOW COLUMNS FROM students")
    print("students columns:", [r[0] for r in cur.fetchall()])

conn.close()
