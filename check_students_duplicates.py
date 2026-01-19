
import mysql.connector
import sys

# Database configuration
DB_CONFIG = {
    'host': '13.204.48.33',
    'port': 3306,
    'user': 'root',
    'password': 'tanuj1221',
    'database': 'dec25',
    'charset': 'utf8mb4'
}

def connect_db():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        sys.exit(1)

def main():
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)
    
    print("\n--- Checking for Duplicate student_id ---")
    query = """
    SELECT student_id, COUNT(*) as count
    FROM students
    GROUP BY student_id
    HAVING count > 1
    """
    cursor.execute(query)
    results = cursor.fetchall()
    
    if results:
        print(f"Found {len(results)} duplicate student_ids:")
        for r in results:
            print(f"  ID: {r['student_id']}, Count: {r['count']}")
    else:
        print("No duplicate student_ids found (Primary Key constraint likely active).")

    # Inspect columns
    cursor.execute("SELECT * FROM students LIMIT 1")
    columns = list(cursor.fetchone().keys())
    print(f"\nColumns available: {columns}")
    
    # Check for potential duplicate students (Same Name + Batch + Center)
    # Adjust columns based on availability found above
    candidate_cols = ['student_name', 'name', 'father_name', 'dob', 'batchNo', 'center']
    group_cols = [c for c in candidate_cols if c in columns or (c == 'student_name' and 'name' in columns)]
    
    # If 'name' is used instead of 'student_name'
    if 'name' in columns and 'student_name' not in columns:
        group_cols = [c if c != 'student_name' else 'name' for c in group_cols]
        
    if len(group_cols) > 0:
        print(f"\n--- Checking for Duplicate Data {group_cols} ---")
        cols_str = ", ".join(group_cols)
        query = f"""
        SELECT {cols_str}, COUNT(*) as count, GROUP_CONCAT(student_id) as ids
        FROM students
        GROUP BY {cols_str}
        HAVING count > 1
        """
        try:
            cursor.execute(query)
            results = cursor.fetchall()
            if results:
                print(f"Found {len(results)} groups of potential duplicate students:")
                for r in results:
                    print(f"  Data: {[r[c] for c in group_cols]} -> IDs: {r['ids']}")
            else:
                print("No duplicate student records found based on data columns.")
        except Exception as e:
            print(f"Query check failed: {e}")
            
    conn.close()

if __name__ == "__main__":
    main()
