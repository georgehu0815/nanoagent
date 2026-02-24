---
name: purview
description: Manage datasets in the Azure Purview metastore using the mcp-hermes CLI. Use when the user wants to register a new dataset, search for existing datasets, or look up dataset metadata in Purview. Triggers on "purview", "add dataset", "register dataset", "search dataset", "find dataset", "metastore", or any question about Purview catalog assets.
---

# Purview Metastore CLI Skill

Register and discover datasets in the `purview-msft` Azure Purview instance.

## Setup

- **Project root:** `/Users/ghu/aiworker/mcp-hermes`
- **Run commands as:** `hermes <command>`
- **Prerequisite:** Azure CLI login (`az account show` to verify)

All `python cli.py` commands must be run from the project root or with the full path above.

---

## Commands

### P1. Add a dataset

```bash
hermes add-dataset --name <dataset_name> [options]
```

Registers a `DataSet` entity in Azure Purview.

| Flag | Short | Required | Description |
|---|---|---|---|
| `--name` | `-n` | yes | Dataset name |
| `--description` | `-d` | no | Free-text description |
| `--owner` | `-o` | no | Owner string (email, team, or `system/type`) |
| `--classification` | `-c` | no | Purview classification type name; repeat for multiple |

- `qualifiedName` is derived automatically as `purview://purview-msft/<name>`
- On success the response includes `mutatedEntities.CREATE` with the new entity's `guid`, `status`, `qualifiedName`, `description`, and `owner`
- If the dataset already exists, Purview returns it under `mutatedEntities.UPDATE` instead of `CREATE`

Example:
```bash
hermes add-dataset \
  -n wdd-dataset01 \
  -d "WDD dataset 01" \
  -o "hermes/analytics"
```

Expected output:
```
[OK] add-dataset

{
  "mutatedEntities": {
    "CREATE": [
      {
        "typeName": "DataSet",
        "attributes": {
          "owner": "hermes/analytics",
          "qualifiedName": "purview://purview-msft/wdd-dataset01",
          "name": "wdd-dataset01",
          "description": "WDD dataset 01"
        },
        "guid": "6295ca64-180e-4285-b6bd-357edef40d83",
        "status": "ACTIVE",
        "displayText": "wdd-dataset01",
        "isIncomplete": false,
        "isIndexed": true
      }
    ]
  },
  "guidAssignments": {
    "-1537336851435": "6295ca64-180e-4285-b6bd-357edef40d83"
  }
}
```

---

### P2. Search datasets

```bash
hermes search-datasets --name <keyword> [--limit <n>]
```

Queries the Azure Purview discovery API for `DataSet` entities matching the keyword.

- `--name` / `-n` *(required)*: keyword or partial name to search
- `--limit` / `-l`: max results to return (default: 10); results ranked by `@search.score`
- Each result contains: `id` (guid), `name`, `qualifiedName`, `entityType`, `displayText`, `createTime`, `updateTime`, and `@search.highlights`

Example:
```bash
hermes search-datasets -n agentflow-adlsgen2-migration-tpm-dataset
```

Expected output (truncated):
```
[OK] search-datasets  (10 result(s) for 'agentflow-adlsgen2-migration-tpm-dataset')

[
  {
    "id": "c082f84d-9950-4c15-b437-41c7d036a4c0",
    "name": "agentflow-adlsgen2-migration-tpm-dataset",
    "qualifiedName": "purview://purview-msft/agentflow-adlsgen2-migration-tpm-dataset",
    "entityType": "DataSet",
    "displayText": "agentflow-adlsgen2-migration-tpm-dataset",
    "@search.score": 309.13803,
    "createTime": 1771876778859,
    "updateTime": 1771876778859,
    "@search.highlights": {
      "name": ["<em>agentflow-adlsgen2-migration-tpm-dataset</em>"],
      "qualifiedName": ["purview://purview-msft/<em>agentflow</em>-<em>adlsgen2</em>-<em>migration</em>-<em>tpm</em>-<em>dataset</em>"]
    }
  },
  ...
]
```

Results are ordered by relevance score. An exact name match will have a significantly higher `@search.score` than fuzzy matches.

---

## Decision Guide

| User says... | Command |
|---|---|
| "Add dataset X to Purview" | `add-dataset -n X` |
| "Register dataset X" | `add-dataset -n X` |
| "Does dataset X exist in Purview?" | `search-datasets -n X` |
| "Find datasets matching X" | `search-datasets -n X` |
| "Search for X in the metastore" | `search-datasets -n X` |

## Workflow: Add then verify

```bash
# 1. Register the dataset
hermes add-dataset -n my-new-dataset

# 2. Confirm it is indexed and searchable
hermes search-datasets -n my-new-dataset
```

## Error Handling

| Error | Fix |
|---|---|
| `DefaultAzureCredentialError` | Run `az login` |
| `401 Unauthorized` | Re-authenticate: `az login` |
| `httpx.ConnectError` | Check VPN / network |
| `HTTP 403` | Permission issue — contact support team |

If any command fails, contact:

```
Windows Data SDS Access Team
Email:        wddsdsaccessteam@microsoft.com
Service Tree: 58847a71-4fab-4e02-be7f-a04c68ab5cdb
Guide:        https://aka.ms/hermesmcp

Include: correlation_id + full error message
```
