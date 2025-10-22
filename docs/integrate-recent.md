## A new endpoint /api/entries/recent was added to the backend.

## API Contract
Here’s how your UI agent should call the /api/entries/recent endpoint:
- Method: GET
- URL: /api/entries/recent
- Query params:
    - limit (optional, default 10, allowed range 1–100)
        - Example: /api/entries/recent?limit=20

- Headers:
    - Authorization: Bearer
    - Content-Type: not required (no body)

- Body: none

Responses:
- 200 OK: JSON array of entry objects (id, uuid, title, name, description, kind, createdAt, updatedAt)
- 400 Bad Request: when limit is out of range
- 401 Unauthorized: missing/invalid token

Example curl: curl -i -H "Authorization: Bearer $ACCESS_TOKEN"
"[http://localhost:8080/api/entries/recent?limit=10](http://localhost:8080/api/entries/recent?limit=10)"

The response is a JSON array of entry objects.

The response will look like this 

```json
[
  {
    "uuid": "dbd992e9-f0b9-4680-9f78-44e2f2741163",
    "name": "https://chatgpt.com/c/68f5d45a-f3b0-8328-b615-0b8a313f5321",
    "description": "chat gpt description",
    "kind": "link",
    "createdAt": "2025-10-20T19:03:31.330687Z",
    "updatedAt": "2025-10-20T19:03:31.330687Z"
  },
  {
    "uuid": "c1f57433-093a-4dd4-8d10-182c94bf51e1",
    "name": "http://localhost:3000/home",
    "description": "url",
    "kind": "link",
    "createdAt": "2025-10-19T06:52:21.355208Z",
    "updatedAt": "2025-10-19T06:52:21.355208Z"
  }
]

```

## When/Where should this be used?
- On component load, the [SectionsSidebar.tsx](../src/components/SectionsSidebar.tsx) component make a api call to /api/entries/recent endpoint.
- The SectionsSidebar component should remove the hardcoded/static values, and use the live data that comes from the /api/entries/recent endpoint.
- On uploading an item (/api/entries/text, /api/entries/link, /api/entries/binaries) and getting a successful response (200, or 201), the SectionsSidebar.tsx should recall the /api/entries/recent endpoint to get the most recent data, then the component should rerender with the most updated data that comes from the response
- 
