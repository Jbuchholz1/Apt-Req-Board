const MCP_URL = process.env.BULLHORN_MCP_URL || 'https://bullhorn-mcp-production.up.railway.app/mcp';

let requestId = 0;

// READ-ONLY ENFORCEMENT: Only these MCP tools are allowed.
// Nothing writes back to Bullhorn.
const ALLOWED_TOOLS = new Set([
  'query_entity',
  'search_jobs',
  'get_submissions',
  'get_candidate',
  'search_candidates',
  'get_entity_fields',
]);

/**
 * Call a read-only tool on the Bullhorn MCP server via JSON-RPC over SSE.
 * PRIVATE — not exported. Only used by the convenience wrappers below.
 */
async function callTool(toolName, args = {}) {
  if (!ALLOWED_TOOLS.has(toolName)) {
    throw new Error(`Blocked: tool "${toolName}" is not in the allowed tools whitelist`);
  }
  requestId++;
  const body = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: toolName, arguments: args },
    id: requestId,
  };

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`MCP request failed: ${res.status} ${res.statusText}`);
  }

  // Response is SSE format — parse the data line
  const text = await res.text();
  const dataLine = text.split('\n').find(l => l.startsWith('data: '));
  if (!dataLine) {
    throw new Error('No data in MCP response');
  }

  const json = JSON.parse(dataLine.slice(6));
  if (json.error) {
    throw new Error(`MCP error: ${json.error.message}`);
  }

  // Extract text content from result
  const content = json.result?.content;
  if (!content || !content.length) {
    return null;
  }

  const textContent = content.find(c => c.type === 'text');
  if (!textContent) return null;

  // Try to parse as JSON; if not valid JSON, return the raw text
  try {
    return JSON.parse(textContent.text);
  } catch {
    return { message: textContent.text };
  }
}

// --- Convenience wrappers ---

const JOB_FIELDS = [
  'id', 'title', 'status', 'owner', 'clientCorporation', 'clientContact',
  'employmentType', 'numOpenings', 'payRate', 'salary',
  'clientBillRate', 'feeArrangement',
  'customFloat1', 'customFloat2',
  'customText1', 'customText2', 'customText3', 'customText4', 'customText5', 'customText40',
  'dateAdded', 'startDate', 'estimatedEndDate', 'address', 'assignedUsers', 'type',
].join(',');

async function getOpenJobs() {
  return callTool('query_entity', {
    entityType: 'JobOrder',
    where: 'isOpen = true AND isDeleted = false',
    fields: JOB_FIELDS,
    orderBy: '-dateAdded',
    count: 200,
  });
}

async function getAllJobs() {
  return callTool('query_entity', {
    entityType: 'JobOrder',
    where: 'isDeleted = false',
    fields: JOB_FIELDS,
    orderBy: '-dateAdded',
    count: 200,
  });
}

async function getJobById(id) {
  return callTool('query_entity', {
    entityType: 'JobOrder',
    where: `id = ${parseInt(id, 10)} AND isDeleted = false`,
    fields: JOB_FIELDS,
    count: 1,
  });
}

async function getSubmissions(jobOrderId) {
  return callTool('get_submissions', {
    jobOrderId: parseInt(jobOrderId, 10),
    fields: 'id,candidate,status,dateAdded,source',
    count: 50,
  });
}

async function getActivePlacements() {
  return callTool('query_entity', {
    entityType: 'Placement',
    where: "status = 'Approved' OR status = 'Active'",
    fields: 'id,candidate,jobOrder,dateBegin,dateEnd,payRate,clientBillRate,status',
    orderBy: '-dateBegin',
    count: 200,
  });
}

async function searchJobs(query) {
  return callTool('search_jobs', {
    query,
    fields: JOB_FIELDS,
    count: 100,
  });
}

// NOTE: callTool is intentionally NOT exported.
// Nothing writes back to Bullhorn.
module.exports = {
  getOpenJobs,
  getAllJobs,
  getJobById,
  getSubmissions,
  getActivePlacements,
  searchJobs,
};
