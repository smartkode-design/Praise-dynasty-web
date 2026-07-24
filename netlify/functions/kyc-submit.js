// Netlify Serverless Function: KYC Submission Proxy
// Writes KYC data to Firebase Realtime Database from the server side,
// bypassing client-side auth requirements.

const FIREBASE_DB_URL = "https://praise-dynasty-hni-default-rtdb.firebaseio.com";

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Method not allowed" })
        };
    }

    // CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    try {
        const data = JSON.parse(event.body);

        // Validate required fields
        const required = ["fullName", "bvn", "nin"];
        for (const field of required) {
            if (!data[field] || String(data[field]).trim() === "") {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: `Missing required field: ${field}` })
                };
            }
        }

        // Validate BVN/NIN are 11 digits
        if (!/^\d{11}$/.test(data.bvn)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "BVN must be exactly 11 digits" })
            };
        }
        if (!/^\d{11}$/.test(data.nin)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "NIN must be exactly 11 digits" })
            };
        }

        // Build sanitized KYC document
        const kycDoc = {
            fullName: String(data.fullName).trim(),
            email: String(data.email || "").trim(),
            role: String(data.role || "").trim(),
            bvn: String(data.bvn).trim(),
            nin: String(data.nin).trim(),
            documentUrl: String(data.documentUrl || "").trim(),
            fileName: String(data.fileName || "").trim(),
            source: String(data.source || "standalone_form").trim(),
            submittedAt: Date.now()
        };

        // Try writing to multiple Firebase paths
        const pathsToTry = [
            "agencyResources/kyc_vault",
            "agencyLeads",
            "agencyResources"
        ];

        for (const dbPath of pathsToTry) {
            try {
                const response = await fetch(`${FIREBASE_DB_URL}/${dbPath}.json`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(kycDoc)
                });

                if (response.ok) {
                    const result = await response.json();
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            path: dbPath,
                            id: result.name
                        })
                    };
                }

                const errText = await response.text();
                console.warn(`Firebase write to /${dbPath} failed (${response.status}):`, errText);
            } catch (fetchErr) {
                console.warn(`Fetch to /${dbPath} error:`, fetchErr.message);
            }
        }

        // All paths failed
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "All database paths denied. Firebase rules require authentication.",
                hint: "Enable Anonymous Authentication in Firebase Console > Authentication > Sign-in method"
            })
        };

    } catch (err) {
        console.error("KYC function error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Server error: " + err.message })
        };
    }
};
