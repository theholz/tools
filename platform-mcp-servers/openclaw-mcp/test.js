#!/usr/bin/env node
/**
 * Simple test script for OpenClaw MCP Server
 * Tests gateway connectivity and tool invocation
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

async function testGatewayHealth() {
  console.log("\n=== Testing Gateway Health ===");
  try {
    const res = await fetch(`${GATEWAY_URL}/health`, {
      headers: GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {},
    });
    const data = await res.text();
    console.log(`✅ Gateway reachable: ${res.status}`);
    console.log(`Response: ${data || "{ ok: true }"}`);
    return true;
  } catch (err) {
    console.log(`❌ Gateway unreachable: ${err.message}`);
    return false;
  }
}

async function testToolInvoke() {
  console.log("\n=== Testing /tools/invoke Endpoint ===");
  try {
    const body = JSON.stringify({
      tool: "session_status",
      args: {},
    });
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(GATEWAY_TOKEN && { Authorization: `Bearer ${GATEWAY_TOKEN}` }),
      },
      body,
    });
    const data = await res.json();
    console.log(`✅ Tool invoke works: ${res.status}`);
    console.log(`Response keys: ${Object.keys(data).join(", ")}`);
    return true;
  } catch (err) {
    console.log(`❌ Tool invoke failed: ${err.message}`);
    return false;
  }
}

async function testMCPServer() {
  console.log("\n=== Testing MCP Server Startup ===");
  const { spawn } = await import("child_process");
  
  return new Promise((resolve) => {
    const proc = spawn("node", ["index.js"], {
      cwd: import.meta.dirname || process.cwd(),
      env: {
        ...process.env,
        OPENCLAW_GATEWAY_URL: GATEWAY_URL,
        OPENCLAW_GATEWAY_TOKEN: GATEWAY_TOKEN,
      },
    });
    
    let output = "";
    proc.stderr.on("data", (data) => {
      output += data.toString();
    });
    
    setTimeout(() => {
      proc.kill();
      console.log("MCP Server stderr output:");
      console.log(output);
      
      if (output.includes("30 comprehensive tools registered")) {
        console.log("✅ MCP Server started and registered all tools");
        resolve(true);
      } else {
        console.log("❌ MCP Server did not register tools correctly");
        resolve(false);
      }
    }, 1000);
  });
}

async function runTests() {
  console.log("OpenClaw MCP Server Test Suite");
  console.log("================================");
  console.log(`Gateway URL: ${GATEWAY_URL}`);
  console.log(`Token set: ${GATEWAY_TOKEN ? "Yes" : "No"}`);
  
  const results = {
    health: await testGatewayHealth(),
    invoke: await testToolInvoke(),
    mcpServer: await testMCPServer(),
  };
  
  console.log("\n=== Test Summary ===");
  console.log(`Gateway Health: ${results.health ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Tool Invoke: ${results.invoke ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`MCP Server: ${results.mcpServer ? "✅ PASS" : "❌ FAIL"}`);
  
  const allPassed = Object.values(results).every(Boolean);
  console.log(`\nOverall: ${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(console.error);
