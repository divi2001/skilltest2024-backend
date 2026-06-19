import mysql.connector

conn = mysql.connector.connect(
    host="103.17.193.168",
    port=3306,
    user="root",
    password="tanuj1221",
    database="dec25"
)
cur = conn.cursor()

cur.execute("SELECT student_id FROM textlogs_history LIMIT 5")
print("Sample student_ids:", cur.fetchall())

cur.execute("SELECT COUNT(*) FROM textlogs_history WHERE student_id LIKE '%211151610010%'")
print("LIKE match count:", cur.fetchone())

cur.execute("SELECT COUNT(*) FROM textlogs_history")
print("Total rows:", cur.fetchone())

conn.close()
