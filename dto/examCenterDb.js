class ExamCenterDTO {
    constructor(center, center_name, center_address, pc_count, max_pc,total_pc_count) {
        this.center = center;
        this.center_name = center_name; // Added missing parameter
        this.center_address = center_address;
        this.pc_count = pc_count;
        this.max_pc = max_pc;
        this.total_pc_count = total_pc_count;
    }
}

module.exports = ExamCenterDTO;
