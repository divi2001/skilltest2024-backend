import mysql.connector
import pandas as pd
import os

conn = mysql.connector.connect(
    host="103.17.193.168",
    port=3306,
    user="root",
    password="tanuj1221",
    database="dec25"
)

enrollment_numbers = [
    "5151524930",
    "5151605289",
    "5151615379",
    "5351605899",
    "5351635996",
    "5551616528",
    "5552506619",
    "6151607043",
    "6151607052",
    "6151607059",
    "6552607866",
    "7451608534",
    "8251619140",
    "8351609480",
    "8351629576",
    "8351629578",
]

output_dir = r"C:\freelancer\kk exams software\skilltest2024-backend\textlogs_exports"
os.makedirs(output_dir, exist_ok=True)

for student_id in enrollment_numbers:
    cur = conn.cursor()
    cur.execute("SELECT student_id, fullname FROM students WHERE student_id = %s LIMIT 1", (student_id,))
    rows = cur.fetchall()

    if rows:
        name = rows[0][1]
        print(f"\n[{student_id}] Found: name={name}")
    else:
        print(f"\n[{student_id}] Student not found in students table, checking textlogs anyway...")

    cur2 = conn.cursor()
    cur2.execute("SELECT * FROM textlogs_history WHERE student_id = %s", (student_id,))
    cols = [desc[0] for desc in cur2.description]
    data = cur2.fetchall()
    df = pd.DataFrame(data, columns=cols)
    print(f"  Rows in textlogs_history: {len(df)}")

    if len(df) > 0:
        output = os.path.join(output_dir, f"textlogs_history_{student_id}.xlsx")
        df.to_excel(output, index=False)
        print(f"  Saved: {output}")
    else:
        print(f"  No textlogs data, skipping export")

conn.close()
print("\nDone!")
