# GigTask Assignment 2 scaffold

GigTask is a freelance micro-jobs marketplace. This checkout carries forward the [GitTask Assignment 1 database repository](https://github.com/MohitSharma25/GitTask) at commit `5d38fee` and prepares the Assignment 2 project structure.

## Structure

```text
db/                 Inherited PostgreSQL, MongoDB, seeders, performance captures, and original README
api/                Reserved for the API layer
web/                Reserved for the web frontend
docs/               Requirements, planned API, wireframes, and database handover note
```

The inherited database files were moved into `db/` without changing their contents. See [the original database README](db/README.md) for prerequisites, setup order, and scripts. Run its relative commands from the `db/` directory. Database setup and end-to-end validation in this checkout are still pending; the [handover note](docs/handover_note.md) records the static findings and work needed before implementation.

## Planning documents

- [Requirements and screen/persona map](docs/requirements_and_screens.md)
- [Preliminary page wireframes](docs/design/wireframes.md)
- [Planned API endpoints](docs/api_endpoints.md)
- [Database handover note](docs/handover_note.md)

## Status
