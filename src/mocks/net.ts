
// Mock for Node.js 'net' module in browser
export const isIPv4 = (input: string) => {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(input);
};

export const isIPv6 = (input: string) => {
    return /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(input);
};

export const isIP = (input: string) => {
    if (isIPv4(input)) return 4;
    if (isIPv6(input)) return 6;
    return 0;
};

export const connect = () => {
    throw new Error('net.connect not supported in browser');
};

export const createConnection = () => {
    throw new Error('net.createConnection not supported in browser');
};

export const Socket = class {
    constructor() {
        throw new Error('net.Socket not supported in browser');
    }
};

export default {
    isIPv4,
    isIPv6,
    isIP,
    connect,
    createConnection,
    Socket
};
