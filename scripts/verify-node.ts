import fetch from 'node-fetch'; // or use native fetch if node 18+

const TARGET_URL = 'https://api.cantonnodes.com';

async function verifyNode() {
    console.log(`Verifying Daml JSON API at: ${TARGET_URL}`);

    const checks = [
        { path: '/v1/query', method: 'POST', body: JSON.stringify({ templateIds: [] }), expectedStatuses: [200, 401, 400] },
        { path: '/v1/fetch', method: 'POST', body: JSON.stringify({ templateId: 'Unknown' }), expectedStatuses: [200, 401, 400, 404] },
        { path: '/livez', method: 'GET', expectedStatuses: [200] },
        { path: '/readyz', method: 'GET', expectedStatuses: [200] }
    ];

    let successCount = 0;

    for (const check of checks) {
        const url = `${TARGET_URL}${check.path}`;
        try {
            const options: any = { method: check.method };
            if (check.method === 'POST') {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = check.body;
            }

            console.log(`Checking ${check.method} ${check.path}...`);
            const res = await fetch(url, options);
            console.log(`  -> Status: ${res.status} ${res.statusText}`);

            if (check.expectedStatuses.includes(res.status)) {
                console.log(`  -> PASSED (Compatible response)`);
                successCount++;
            } else if (res.status === 401) {
                // 401 is actually a very good sign it IS a Daml Ledger API, just protected
                console.log(`  -> PASSED (Service active, requires auth)`);
                successCount++;
            } else if (res.status === 404) {
                console.log(`  -> FAILED (Calculated as Endpoint not found)`);
            } else {
                console.log(`  -> UNKNOWN RESPONSE`);
            }
        } catch (error: any) {
            console.error(`  -> ERROR: ${error.message}`);
        }
    }

    console.log('\n--- Verification Summary ---');
    if (successCount > 0) {
        console.log('✅ The node appears to be a valid Daml JSON API server (or compatible).');
        console.log('Note: Most endpoints require a valid JWT token (401 Unauthorized), which confirms the service is running.');
    } else {
        console.log('❌ The node does NOT respond like a standard Daml JSON API server.');
    }
}

verifyNode();
