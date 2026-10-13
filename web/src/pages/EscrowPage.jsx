// Audit trail: read-only wallet_audit_logs for the acting client, with a date
// filter and a running balance recomputed by a window function.
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../api/client.js';
import { DataTable, Pagination } from '../components/DataTable.jsx';
import { ClientSearch } from '../components/pickers.jsx';
import { QueryState } from '../components/StateViews.jsx';
import { Alert, Badge, Button, Card, Field, Money, PageHeader, StatCard } from '../components/ui.jsx';
import { useActor } from '../context/ActorContext.jsx';
import { formatDateTime, toInputDate } from '../lib/format.js';

export function EscrowPage() {
  const { actor, setActor } = useActor();
  const [draft, setDraft] = useState({ from: '', to: '' });
  const [filter, setFilter] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ['escrow', actor?.id, filter, page],
    queryFn: () => api.get(`/api/clients/${actor.id}/audit${qs({ ...filter, page, pageSize: 25 })}`),
    enabled: Boolean(actor),
    placeholderData: keepPreviousData,
  });

  if (!actor) {
    return (
      <>
        <PageHeader title="Escrow audit trail" />
        <Card title="Whose escrow?">
          <ClientSearch value={null} onSelect={setActor} />
        </Card>
      </>
    );
  }

  const rangeInvalid = draft.from && draft.to && draft.from > draft.to;
  const applyFilter = (f) => {
    setDraft(f);
    setFilter(f);
    setPage(1);
  };
  const preset = (days) =>
    applyFilter({ from: toInputDate(new Date(Date.now() - (days - 1) * 86_400_000)), to: toInputDate(new Date()) });

  return (
    <>
      <PageHeader
        title="Escrow audit trail"
        description={`Read-only wallet_audit_logs for ${actor.name}. Rows are written by the trigger and cannot be edited or deleted.`}
      />

      <Card>
        <form
          className="filter-bar"
          onSubmit={(e) => {
            e.preventDefault();
            if (!rangeInvalid) applyFilter(draft);
          }}
        >
          <Field label="From" htmlFor="escrow-from">
            <input id="escrow-from" type="date" className="input" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </Field>
          <Field label="To" htmlFor="escrow-to">
            <input id="escrow-to" type="date" className="input" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </Field>
          <Button type="submit" disabled={Boolean(rangeInvalid)}>
            Apply
          </Button>
          <Button variant="ghost" onClick={() => applyFilter({ from: '', to: '' })}>
            All time
          </Button>
          <div className="chip-row">
            <button type="button" className="chip" onClick={() => preset(1)}>Today</button>
            <button type="button" className="chip" onClick={() => preset(30)}>Last 30 days</button>
            <button type="button" className="chip" onClick={() => preset(90)}>Last 90 days</button>
          </div>
        </form>
        {rangeInvalid && <Alert tone="warning">“From” must be on or before “To”.</Alert>}
      </Card>

      <QueryState query={q} loadingLabel="Loading audit rows…">
        {(d) => (
          <>
            <div className="stats-grid">
              <StatCard label="Current escrow" value={<Money value={d.client.escrow_balance} />} />
              <StatCard label="Debits in range" value={<Money value={d.summary.totalDebits} action="DEBIT" />} />
              <StatCard label="Credits in range" value={<Money value={d.summary.totalCredits} action="CREDIT" />} />
              <StatCard
                label="Rows matching the trigger"
                tone={d.total > 0 && d.summary.matchingRows === d.total ? 'success' : undefined}
                value={d.total === 0 ? '—' : `${d.summary.matchingRows.toLocaleString('en-IN')} / ${d.total.toLocaleString('en-IN')}`}
                hint="running balance = stored balance_after"
              />
            </div>

            {d.total > 0 && d.summary.matchingRows < d.total && (
              <Alert tone="info" title="Why some rows don’t match">
                The running balance is computed back from today’s real escrow balance. Rows written by the database trigger (for
                example every gig funded or top-up made in this app) match it exactly. The inherited seeder inserted its 100,000
                history rows with random <code>balance_after</code> values, so those rows don’t add up — a data-generation issue
                recorded in the handover note, left unchanged on purpose.
              </Alert>
            )}

            <Card
              title={`${d.total.toLocaleString('en-IN')} entries`}
              subtitle={filter.from || filter.to ? `From ${filter.from || 'the start'} to ${filter.to || 'today'} · newest first` : 'All time · newest first'}
              actions={<TopUp clientId={actor.id} />}
            >
              {d.items.length === 0 ? (
                <p className="state state-empty">{d.total === 0 ? 'No escrow changes in this period.' : 'This page is past the last entry.'}</p>
              ) : (
                <>
                  <DataTable
                    caption="Escrow audit entries"
                    dimmed={q.isPlaceholderData}
                    rows={d.items}
                    columns={[
                      { key: 'seq', header: '#', align: 'right' },
                      { key: 'created_at', header: 'When', render: (r) => formatDateTime(r.created_at) },
                      { key: 'action_type', header: 'Action', render: (r) => <Badge tone={r.action_type === 'DEBIT' ? 'debit' : 'credit'}>{r.action_type}</Badge> },
                      { key: 'amount_changed', header: 'Amount', align: 'right', render: (r) => <Money value={r.amount_changed} signed /> },
                      { key: 'balance_after', header: 'balance_after (trigger)', align: 'right', render: (r) => <Money value={r.balance_after} /> },
                      {
                        key: 'running_balance',
                        header: 'Running balance (computed)',
                        align: 'right',
                        render: (r) => (
                          <span className={r.consistent ? '' : 'text-danger'} title={r.consistent ? 'Matches balance_after' : 'Does not match balance_after'}>
                            <Money value={r.running_balance} /> {r.consistent ? '✓' : '✗'}
                          </span>
                        ),
                      },
                    ]}
                  />
                  <Pagination page={d.page} totalPages={d.totalPages} total={d.total} isFetching={q.isFetching} onPage={setPage} />
                </>
              )}
              <details className="explain">
                <summary>How the running balance is computed</summary>
                <p>
                  Starting from the client’s current <code>escrow_balance</code>, the API walks back through the history:{' '}
                  <code>current − SUM(amount_changed) OVER (ORDER BY … ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING)</code>.
                  Amounts are signed (the trigger stores NEW − OLD, so debits are negative). The window covers the whole history
                  before the date filter is applied, so a filtered range shows the correct balances. Each row is compared with the{' '}
                  <code>balance_after</code> the trigger stored at the time.
                </p>
              </details>
            </Card>
          </>
        )}
      </QueryState>
    </>
  );
}

function TopUp({ clientId }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('5000');
  const m = useMutation({
    mutationFn: () => api.post(`/api/clients/${clientId}/topup`, { amount }),
    onSuccess: () => {
      ['escrow', 'clients'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      setOpen(false);
    },
  });
  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Add money
      </Button>
    );
  }
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <input className="input input-sm" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Top-up amount" />
      <Button type="submit" size="sm" loading={m.isPending}>Add</Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      {m.isError && <span className="text-danger">{m.error.message}</span>}
    </form>
  );
}
