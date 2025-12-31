import { readFileSync } from "fs";

const model = process.argv[2];
const jsonFile = process.argv[3];

if (!model || !jsonFile) {
  console.error("Usage: bun test_request.ts <model> <json_file>");
  process.exit(1);
}

try {
  const fileContent = readFileSync(jsonFile, "utf-8");
  const requestBody = JSON.parse(fileContent);

  // Replace placeholder
  requestBody.model = model;

  const isMessages = jsonFile.includes("/messages/") || jsonFile.startsWith("messages/");
  const endpoint = isMessages ? "/v1/messages" : "/v1/chat/completions";
  const url = `http://localhost:3000${endpoint}`;
  console.log(`Sending request to ${url} with model: ${model}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();

  try {
      const data = JSON.parse(responseText);
      console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
      console.log("Response (Text):", responseText);
  }
  
  if (!response.ok) {
      console.error(`Request failed with status ${response.status}`);
  }

} catch (error) {
  console.error("Error:", error);
}
