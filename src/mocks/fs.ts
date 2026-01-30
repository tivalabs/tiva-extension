export const constants = {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1
};

export const access = (path: any, mode: any, callback: any) => {
    if (typeof mode === 'function') callback = mode;
    if (callback) callback(null);
};

export const readFile = (path: any, options: any, callback: any) => {
    if (typeof options === 'function') callback = options;
    if (callback) callback(null, Buffer.from(''));
};

export const writeFile = (path: any, data: any, options: any, callback: any) => {
    if (typeof options === 'function') callback = options;
    if (callback) callback(null);
};

export const stat = (path: any, callback: any) => {
    if (callback) callback(null, {
        isFile: () => false,
        isDirectory: () => false,
        size: 0
    });
};

export const exists = (path: any, callback: any) => {
    if (callback) callback(false);
};

export const readFileSync = () => Buffer.from('');
export const writeFileSync = () => { };
export const existsSync = () => false;
export const mkdirSync = () => { };

export const promises = {
    access: async () => { },
    readFile: async () => Buffer.from(''),
    writeFile: async () => { },
    stat: async () => ({ isFile: () => false, isDirectory: () => false, size: 0 }),
};

export default {
    constants,
    access,
    readFile,
    writeFile,
    stat,
    exists,
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    promises,
};
