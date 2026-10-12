# GigTask preliminary wireframes

**Look:** dark navy headings (`#17233B`), teal actions (`#0D8A83`), light neutral background (`#F6F8FA`), and a system sans-serif font. Reuse buttons, labeled forms, filter bars, status badges, tables, cards, and feedback messages. On phones, side-by-side panels stack vertically and navigation collapses to a menu.

## Shared shell

```text
+--------------------------------------------------------------------+
| GigTask   Browse  Fund Gig  Escrow  Analytics  Nearby  Reviews     |
|                                                  Demo actor [v]    |
+--------------------------------------------------------------------+
| Screen content                                                     |
+--------------------------------------------------------------------+
```

## 1. Browse

```text
+--------------------------------------------------------------------+
| Clients | Freelancers | Contracts                                  |
| Search [____________________]       Status / skill filter [v]      |
|--------------------------------------------------------------------|
| Name / ID              Summary                         View >       |
| Name / ID              Summary                         View >       |
|--------------------------------------------------------------------|
| < Previous                      Page 1 of N              Next >     |
|--------------------------------------------------------------------|
| Detail drawer: record facts, portfolio preview, contract status    |
| [Move to IN_PROGRESS] [Mark COMPLETED] when applicable             |
+--------------------------------------------------------------------+
```

## 2. Fund a gig

```text
+--------------------------------+-----------------------------------+
| Client [v]                     | Escrow before: amount             |
| Freelancer [v]                 | Escrow after: amount              |
| Budget [________]              | Contract: ID, status FUNDED       |
| [Fund gig]                     | New audit entry: amount, time     |
+--------------------------------+-----------------------------------+
| Clear success or specific funding / constraint error               |
+--------------------------------------------------------------------+
```

## 3. Escrow audit

```text
+--------------------------------------------------------------------+
| Client [v]        From [date]        To [date]       [Apply]        |
| Current escrow: amount                                             |
|--------------------------------------------------------------------|
| Date          Action          Change          Running balance       |
| ...           DEBIT           ...             ...                   |
+--------------------------------------------------------------------+
```

## 4. Analytics

```text
+--------------------------------------------------------------------+
| Freelancer [v]       Period [v]        [Refresh lifetime stats]    |
| Last refreshed: date and time                                      |
|--------------------------------------------------------------------|
| Completed contracts        Total earnings       Rank               |
|--------------------------------------------------------------------|
| Seven-day moving-average earnings chart                            |
|--------------------------------------------------------------------|
| Rank           Freelancer              Moving average / earnings   |
+--------------------------------------------------------------------+
```

## 5. Nearby workers

```text
+--------------------------------------------------------------------+
| Job-site origin: [longitude] [latitude]     Radius: 5 km [Search] |
|--------------------------------------------------------------------|
|                                      | Worker   Distance   Ping age  |
|                 MAP                  | ...      0.8 km     now       |
|           job site + workers         | ...      1.6 km     1 min     |
|                                      | Auto-updating                 |
+--------------------------------------------------------------------+
```

## 6. Reviews and portfolio

```text
+--------------------------------------------------------------------+
| Freelancer [v]       Overall average: 4.2      Reviews: 125       |
|--------------------------------------------------------------------|
| Rating distribution chart     | Top skill-tag chart                |
|--------------------------------------------------------------------|
| Portfolio: skills, certifications, experience, bio, hourly rate   |
+--------------------------------------------------------------------+
```

Every screen also needs explicit loading, empty, and error presentations. The numbers above are layout examples, not claims about seeded data.
