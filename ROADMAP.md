# Emulator Studio — Roadmap

Wishlist of emulators and local tooling to support in future dashboards across **GCP, AWS, and Azure**.

**Status today:** Cloud Pub/Sub and Cloud Storage (via `fake-gcs-server`) are implemented.

---

## Google Cloud

| Service             | Local option                      | Notes                                                |
| ------------------- | --------------------------------- | ---------------------------------------------------- |
| **Cloud Pub/Sub**   | `gcloud beta emulators pubsub`    | ✅ Implemented                                       |
| **Cloud Storage**   | `fsouza/fake-gcs-server` (Docker) | ✅ Implemented — no official gcloud storage emulator |
| **Cloud Firestore** | `gcloud beta emulators firestore` | Document database                                    |
| **Cloud Spanner**   | `gcloud beta emulators spanner`   | Relational database                                  |
| **Cloud Bigtable**  | `gcloud beta emulators bigtable`  | Wide-column database                                 |
| **Cloud Datastore** | `gcloud beta emulators datastore` | Legacy document database                             |

---

## Azure

| Service                          | Local option                                                                     | Notes                        |
| -------------------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| **Blob / Queue / Table Storage** | [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite)  | Official, open source        |
| **Cosmos DB**                    | [Cosmos DB Emulator](https://learn.microsoft.com/azure/cosmos-db/local-emulator) | Official (Windows and Linux) |
| **Service Bus**                  | Docker / community images                                                        | No full official emulator    |
| **Event Hubs**                   | Mocks or dev namespaces                                                          | Limited local options        |

---

## AWS

AWS has few single-service official emulators; most local workflows use third-party stacks.

| Service                     | Local option                                                                                                                                       | Notes                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **SQS, SNS, S3, Lambda, …** | [LocalStack](https://localstack.cloud/)                                                                                                            | Broad AWS surface (community / Pro) |
| **DynamoDB**                | [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)                                              | Official JAR                        |
| **Lambda + API Gateway**    | [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-start-lambda.html) (`sam local`) | Official local invoke               |

---

## Priority ideas

1. **Firestore** — next GCP emulator with official `gcloud` support.
2. **Azurite** — strong official story for Azure storage; good second cloud provider.
3. **LocalStack** — covers the most common AWS integration tests in one process.

---

## Out of scope (for now)

- Production cloud deployments or hosted emulators
- Full parity with every cloud API (e.g. full GCS IAM / signed URLs on fake-gcs-server)
- Replacing vendor CLI tools — Emulator Studio orchestrates and exposes dashboards on top of them
