
// Mock for Node.js 'dns' module in browser
export const Resolver = class {
    resolve() { return []; }
    resolve4() { return []; }
    resolve6() { return []; }
};

export const promises = {
    Resolver
};

export default {
    Resolver,
    promises,
    lookup: (hostname: string, options: any, callback: any) => {
        if (typeof options === 'function') {
            callback = options;
        }
        callback(null, '127.0.0.1', 4);
    },
    resolve: () => [],
    resolve4: () => [],
    resolve6: () => []
}; 
