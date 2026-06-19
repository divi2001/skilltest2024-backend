class PcRegistration {
    constructor(id, center, ip_address, disk_id, mac_address, os, ram, processor) {
        this.id = id;
        this.center = center;
        this.ip_address = ip_address;
        this.disk_id = disk_id;
        this.mac_address = mac_address;
        this.os = os;
        this.ram = ram;
        this.processor = processor;
    }
}

module.exports = PcRegistration;
