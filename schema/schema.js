// schema.js
const schema = {
    admindb: {
        adminid: 'BIGINT PRIMARY KEY',
        password: 'LONGTEXT'
    },
    students: {
        student_id: 'BIGINT PRIMARY KEY',
        password: 'LONGTEXT',
        instituteId: 'BIGINT',
        batchNo: 'INT REFERENCES batchdb(batchNo)',
        batchdate: 'DATE',
        fullname: 'VARCHAR(100)',
        subjectsId: 'INT REFERENCES subjectsdb(subjectId)',
        courseId: 'INT',
        batch_year: 'VARCHAR(100)',
        loggedin: 'BOOLEAN',
        done: 'BOOLEAN',
        photo: 'LONGTEXT',
        center: 'INT REFERENCES examcenterdb(center)',
        reporting_time: 'TIME',
        start_time: 'TIME',
        end_time: 'TIME',
        day: 'INT',
        qset: 'INT',
        base64: 'LONGTEXT',
        sign_base64:'LONGTEXT',
        IsShorthand: 'BOOLEAN',
        IsTypewriting: 'BOOLEAN',
        departmentId: 'INT REFERENCES departmentdb(departmentId)',
        disability: 'BOOLEAN'
    },
    subjectsdb: {
        subjectId: 'INT PRIMARY KEY',
        courseId: 'INT',
        subject_name: 'VARCHAR(100)',
        subject_name_short: 'VARCHAR(50)',
        daily_timer: 'INT',
        passage_timer: 'INT',
        demo_timer: 'INT',
        disability_passage_timer:'INT',
        typing_timer:"INT",
        disability_typing_timer: 'INT'
    },
    departmentdb: {
        departmentId: 'INT PRIMARY KEY',
        departmentName: 'VARCHAR(255)',
        departmentPassword: 'LONGTEXT',
        logo: 'LONGTEXT'
    },
    studentlogs: {
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
        student_id: 'BIGINT',
        center: 'INT REFERENCES examcenterdb(center)',
        loginTime: 'TIMESTAMP NULL',
        login: 'BOOLEAN',
        trial_time: 'TIMESTAMP NULL',
        audio1_time: 'TIMESTAMP NULL',
        passage1_time: 'TIMESTAMP NULL',
        audio2_time: 'TIMESTAMP NULL',
        passage2_time: 'TIMESTAMP NULL',
        trial_passage_time: 'TIMESTAMP NULL',
        typing_passage_time: 'TIMESTAMP NULL',
        feedback_time: 'TIMESTAMP NULL',
        UNIQUE: '(student_id)'
    },
    loginlogs: {
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
        student_id: 'BIGINT REFERENCES studentlogs(student_id)',
        login_time: 'TIMESTAMP',
        ip_address: 'LONGTEXT REFERENCES pcregistration(ip_address)',
        disk_id: 'LONGTEXT',
        mac_address: 'LONGTEXT'
    },
    examcenterdb: {
        center: 'INT PRIMARY KEY',
        centerpass: 'LONGTEXT',
        center_name: 'VARCHAR(100)',
        center_address: 'VARCHAR(255)',
        pc_count: 'INT',
        max_pc: 'INT',
        attendanceroll: 'LONGTEXT',
        absenteereport: 'LONGTEXT',
        answersheet: 'LONGTEXT',
        blankanswersheet: 'LONGTEXT'
    },
    controllerdb: {
        center: 'INT REFERENCES examcenterdb(center)',
        batchNo: 'INT REFERENCES batchdb(batchNo)',
        controller_code: 'INT',
        controller_name: 'VARCHAR(100)',
        controller_contact: 'BIGINT',
        controller_email: 'VARCHAR(100)',
        controller_pass: 'LONGTEXT',
        district: 'VARCHAR(100)'
    },
    pcregistration: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        center: 'INT NOT NULL REFERENCES examcenterdb(center)',
        ip_address: 'LONGTEXT NOT NULL',
        disk_id: 'LONGTEXT NOT NULL',
        mac_address: 'LONGTEXT NOT NULL'
    },
    audiodb: {
        id: 'INT PRIMARY KEY',
        subjectId: 'INT REFERENCES subjectsdb(subjectId)',
        qset: 'INT',
        code_a: 'VARCHAR(10)',
        code_b: 'VARCHAR(10)',
        code_t: 'VARCHAR(10)',
        audio1: 'VARCHAR(255)',
        passage1: 'LONGTEXT',
        audio2: 'VARCHAR(255)',
        passage2: 'LONGTEXT',
        testaudio: 'VARCHAR(255)',
        textPassageA: 'LONGTEXT',
        textPassageB: 'LONGTEXT'
    },
    computerTyping: {
        id: 'INT PRIMARY KEY',
        subjectId: 'INT REFERENCES subjectsdb(subjectId)',
        qset: 'INT',
        trial_passage: 'LONGTEXT',
        passage_name: 'VARCHAR(10)',
        passage_text: 'LONGTEXT'
    },

    login_requests: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        ip_address: 'VARCHAR(255) NOT NULL',
        request_time: 'DATETIME NOT NULL',
        INDEX: '(ip_address, request_time)'
    },

    audiologs: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        student_id: 'BIGINT REFERENCES studentlogs(student_id)',
        trial: 'INT',
        passageA: 'INT',
        passageB: 'INT'
    },

    batchdb: {
        batchNo: 'INT PRIMARY KEY',
        batchdate: 'DATE',
        reporting_time: 'TIME',
        start_time: 'TIME',
        end_time: 'TIME',
        batchstatus: 'BOOLEAN'
    },
    feedbackdb: {
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',  // Add this line
        student_id: 'BIGINT',
        question1: 'LONGTEXT',
        question2: 'LONGTEXT',
        question3: 'LONGTEXT',
        question4: 'LONGTEXT',
        question5: 'LONGTEXT',
        question6: 'LONGTEXT',
        question7: 'LONGTEXT',
        question8: 'LONGTEXT',
        question9: 'LONGTEXT',
        question10: 'LONGTEXT'
    },
    textlogs: {
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
        student_id: 'BIGINT REFERENCES studentlogs(student_id)',
        mina: 'DECIMAL',
        texta: 'LONGTEXT',
        minb: 'DECIMAL',
        textb: 'LONGTEXT',
        created_at: 'TIMESTAMP'
    },
    finalPassageSubmit: {
        student_id: 'BIGINT',
        passageA: 'LONGTEXT',
        passageB: 'LONGTEXT',
    },
    requestLogs: {
        id: 'INT PRIMARY KEY',
        ip_address: 'LONGTEXT',
        request_time: 'DATETIME'
    },
    expertreviewlog: {
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
        student_id: 'BIGINT',
        passageA: 'TEXT',
        passageB: 'TEXT',
        passageA_word_count: 'INT',
        passageB_word_count: 'INT',
        ansPassageA: 'TEXT',
        ansPassageB: 'TEXT',
        subjectId: 'INT REFERENCES subjectsdb(subjectId)',
        qset: 'INT',
        expertId: 'INT REFERENCES expertdb(expertId)',
        loggedin: 'DATETIME',
        status: 'BOOLEAN',
        submitted: 'DATETIME'
    },
    typingpassagelogs: {
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
        student_id: 'BIGINT',
        trial_time: 'INT',
        trial_passage: 'LONGTEXT',
        passage_time: 'INT',
        passage: 'LONGTEXT',
        time: 'DATETIME'
    },
    typingpassage: {
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
        student_id: 'BIGINT',
        trial_passage: 'LONGTEXT',
        passage: 'LONGTEXT',
        time: 'DATETIME'
    },

    expertdb: {
        expertId: 'INT PRIMARY KEY',
        password: 'VARCHAR(255)',
        expert_name: 'VARCHAR(255)',
        subject_50: 'BOOLEAN',
        subject_51: 'BOOLEAN',
        subject_52: 'BOOLEAN',
        subject_53: 'BOOLEAN',
        subject_54: 'BOOLEAN',
        subject_55: 'BOOLEAN',
        subject_56: 'BOOLEAN',
        subject_57: 'BOOLEAN',
        subject_60: 'BOOLEAN',
        subject_61: 'BOOLEAN',
        subject_62: 'BOOLEAN',
        subject_63: 'BOOLEAN',
        subject_70: 'BOOLEAN',
        subject_71: 'BOOLEAN',
        subject_72: 'BOOLEAN',
        subject_73: 'BOOLEAN',
        audio_rec: 'BOOLEAN',
        audio_mod: 'BOOLEAN',
        paper_check: 'BOOLEAN',
        paper_mod: 'BOOLEAN',
        super_mod: 'BOOLEAN'
    },
    qsetdb: {
        id: 'INT PRIMARY KEY AUTO_INCREMENT',
        subjectId: 'INT REFERENCES subjectsdb(subjectId)',
        Q1PA: 'TEXT',
        Q1PB: 'TEXT',
        Q2PA: 'TEXT',
        Q2PB: 'TEXT',
        Q3PA: 'TEXT',
        Q3PB: 'TEXT',
        Q4PA: 'TEXT',
        Q4PB: 'TEXT'
    },

    answersheet: {
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
        student_id: 'BIGINT',
        image1: 'LONGTEXT',
        image2: 'LONGTEXT',
        image3: 'LONGTEXT',
        image4: 'LONGTEXT',
        upload_date: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    },
    resetrequests:{
        id: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
        student_id: 'BIGINT',
        reason : 'LONGTEXT',
        reseted_by:'TEXT',
        reset_type:'TEXT',
        center: 'INT REFERENCES examcenterdb(center)',
        approved:'TEXT',
        time:"DATETIME"
    },
    features:{
        id:'BIGINT PRIMARY KEY AUTO_INCREMENT',
        feature:'TEXT',
        status:'BOOLEAN'
    }
};

module.exports = schema;