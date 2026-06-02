# Uniback API Curl Tests

This document provides example curl commands for interacting with the Uniback API.

## Environment Variables
```bash
export TEST_FILES_PATH=/path/to/your/test/data/
export API_BASE_URL=http://localhost:8000/api
```

> **NOTE:** Standard CRUD endpoints (Identities, Roles, Groups, Organizations, Authenticators, Collections, Case Studies, ACLs, File Stores) return a **ResponseEnvelope** JSON object:
> ```json
> {
>   "content": "any-type-or-object",
>   "count": 123,
>   "issues": []
> }
> ```
> To extract data with `curl` and `jq`, you might use: `curl ... | jq '.content'`
>
> **Authentication** and **Files** endpoints return direct JSON objects or raw content.

## 1. Authentication (Login/Logout)

### Login
```bash
curl --cookie-jar app-cookies.txt -X PUT "$API_BASE_URL/authn?user=test_user"
```

### Check Status
```bash
curl --cookie app-cookies.txt "$API_BASE_URL/authn"
```

### Logout
```bash
curl --cookie app-cookies.txt -X DELETE "$API_BASE_URL/authn"
```

### Login with API Key (use a valid API Key)
```bash
curl --cookie-jar app-cookies.txt -X PUT "$API_BASE_URL/authn?user=test_user" -H "X-API-Key: 6ba91d3f436e47ddb37c679f1da0c7f4"
```

---

## 2. Files and File Stores

### List File Stores
```bash
curl --cookie app-cookies.txt "$API_BASE_URL/file_stores/"
```

### PUT Folder (Create folder "/f1/f2/")
```bash
curl --cookie app-cookies.txt -H "Content-Type: application/json" -X PUT -d '{}' "$API_BASE_URL/files/f1/f2/"
```

### PUT File (Create or Overwrite file CONTENTS of "/f1/f2/file.fasta")
```bash
curl --cookie app-cookies.txt -H "Content-Type: application/x-fasta" -X PUT --data-binary @"$TEST_FILES_PATH/ls_orchid.fasta" "$API_BASE_URL/files/f1/f2/file.fasta.content"
```

### PUT Archive File (Create or Overwrite file CONTENTS of "/f1/f2/claws_assembly_pipeline-2.2.0.zip")
```bash
curl --cookie app-cookies.txt -H "Content-Type: application/zip" -X PUT --data-binary @"$TEST_FILES_PATH/claws_assembly_pipeline-2.2.0.zip" "$API_BASE_URL/files/f1/f2/claws_assembly_pipeline-2.2.0.zip.content"
```

### GET Folder inside the archive file
```bash
curl --cookie app-cookies.txt "$API_BASE_URL/files/f1/f2/claws_assembly_pipeline-2.2.0.zip/"
```

### GET File inside the archive file
```bash
curl --cookie app-cookies.txt "$API_BASE_URL/files/f1/f2/claws_assembly_pipeline-2.2.0.zip/assembly_pipeline-2.2.0/scripts/get_cov.py.content"
```

### GET Same file, in HTML format with syntax coloring
```bash
curl --cookie app-cookies.txt -H "Accept: text/html" "$API_BASE_URL/files/f1/f2/claws_assembly_pipeline-2.2.0.zip/assembly_pipeline-2.2.0/scripts/get_cov.py.content"
```

### GET Folder (List folder contents)
```bash
curl --cookie app-cookies.txt "$API_BASE_URL/files/f1/"
```

### GET File (Get file contents)
```bash
curl --cookie app-cookies.txt "$API_BASE_URL/files/f1/f2/file.fasta.content"
```

---

## 3. API Keys Management

### List API Keys
```bash
# Get keys for the current user 
curl --cookie app-cookies.txt "http://localhost:8000/api/api_keys/"
```

### Create API Key
```bash
curl --cookie app-cookies.txt -X POST "http://localhost:8000/api/api_keys/" -H "Content-Type: application/json" -d '{"roles": ["guest"]}'
```

### Delete API Key
```bash
# Replace <idx> with the key index obtained from the list
curl --cookie app-cookies.txt -X DELETE "http://localhost:8000/api/api_keys/<idx>"
```

---

## 4. Identity Key-Value Store

### List Keys
```bash
curl --cookie app-cookies.txt "http://localhost:8000/api/identity_store/"
```

### Set Value
```bash
curl --cookie app-cookies.txt -X PUT "http://localhost:8000/api/identity_store/theme" \
     -H "Content-Type: application/json" -d '{"color": "blue", "fontSize": "14px"}'
```

### Get Value
```bash
curl --cookie app-cookies.txt "http://localhost:8000/api/identity_store/theme"
```

### Delete Key
```bash
curl --cookie app-cookies.txt -X DELETE "http://localhost:8000/api/identity_store/theme"
```

---

## 5. Administrative CRUD

### Identities
```bash
# List
curl --cookie app-cookies.txt "http://localhost:8000/api/identities/"

# Create
curl --cookie app-cookies.txt -X POST "http://localhost:8000/api/identities/" \
     -H "Content-Type: application/json" -d '{"name": "New User", "email": "user@example.com"}'

# Update
curl --cookie app-cookies.txt -X PUT "http://localhost:8000/api/identities/<id>" \
     -H "Content-Type: application/json" -d '{"name": "Updated Name"}'

# Delete
curl --cookie app-cookies.txt -X DELETE "http://localhost:8000/api/identities/<id>"
```

### Roles, Groups, Organizations, Authenticators
Similar patterns apply to:
- `/api/roles/`
- `/api/groups/`
- `/api/organizations/`
- `/api/identities_authenticators/`

---

## 6. Collections and Case Studies

### Create Collection
```bash
curl --cookie app-cookies.txt -X POST "http://localhost:8000/api/collections/" -d '{"name": "My Collection"}'
```

### Add Item to Collection
```bash
curl --cookie app-cookies.txt -X POST "http://localhost:8000/api/collection_items/" -d '{"collection_id": 1, "functional_object_uuid": "<uuid>"}'
```

### Create Case Study
```bash
curl --cookie app-cookies.txt -X POST "http://localhost:8000/api/case_studies/" -d '{"name": "Case Study 1"}'
```

---

## 7. ACL Management

### 7.1 List ACLs
```bash
curl --cookie app-cookies.txt "$API_BASE_URL/acls/"
```

### 7.2 Get ACL for a specific object
```bash
curl --cookie app-cookies.txt "$API_BASE_URL/acls/?object_uuid=<uuid>"
```

### 7.3 Create a new ACL
An ACL can be created for a specific object (e.g., a File, Folder, or Collection). You can also include initial permissions in the `details` field during creation.

```bash
curl --cookie app-cookies.txt -X POST "$API_BASE_URL/acls/" \
     -H "Content-Type: application/json" \
     -d '{
           "object_uuid": "<uuid>",
           "object_type": 82,
           "details": [
             {
               "authorizable_id": 10,
               "permission_id": 2
             }
           ]
         }'
```
*Note: `object_type` can often be automatically resolved from the `object_uuid` if the object is registered in the system.*

### 7.4 Manage ACL Details (Permissions)
Once the ACL exists, you can manage fine-grained permissions (ACL Details) by adding entries that link an **Authorizable** (User or Group) with a **Permission Type**.

#### Add or Replace Permissions
To set permissions, send a `PUT` request with a `details` array. 
> **Warning:** This operation replaces the entire list of details for the ACL unless existing detail IDs are included in the array.

```bash
# Replace <acl_id> with the ID obtained during creation (e.g., 123)
curl --cookie app-cookies.txt -X PUT "$API_BASE_URL/acls/<acl_id>" \
     -H "Content-Type: application/json" \
     -d '{
           "details": [
             {
               "authorizable_id": 10,
               "permission_id": 2
             },
             {
               "authorizable_id": 5,
               "permission_id": 2,
               "validity_start": "2026-01-01T00:00:00Z"
             }
           ]
         }'
```

#### Update Existing Permissions
To update a specific detail without removing others, you must include the `id` of all details you want to keep.

```bash
curl --cookie app-cookies.txt -X PUT "$API_BASE_URL/acls/123" \
     -H "Content-Type: application/json" \
     -d '{
           "details": [
             {
               "id": 45,
               "authorizable_id": 10,
               "permission_id": 11
             }
           ]
         }'
```
*In this example, only the detail with ID 45 is kept/updated; any other details previously associated with this ACL are deleted.*

### 7.5 Delete ACL
```bash
curl --cookie app-cookies.txt -X DELETE "$API_BASE_URL/acls/<acl_id>"
```
