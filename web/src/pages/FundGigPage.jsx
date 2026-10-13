// Workflow 1: fund a gig through the fund_gig stored procedure.
// Shows the escrow balance before/after and the wallet_audit_logs row written
// by the trigger; explains each failure (insufficient escrow, freelancer
// already busy = partial unique index) and offers the fix.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { BlockingContract, ContractStatusControl } from '../components/ContractStatusControl.jsx';
import { ClientSearch, FreelancerSearch, FreelancerState } from '../components/pickers.jsx';
import { ErrorState, Loading } from '../components/StateViews.jsx';
import { Alert, Button, Card, DetailList, Field, Money, PageHeader } from '../components/ui.jsx';
import { useActor } from '../context/ActorContext.jsx';
import { formatDateTime, formatMoney, shortId } from '../lib/format.js';

const QUICK_BUDGETS = ['500', '1500', '4000'];
const MAX_AMOUNT = 99999999.99;
const AMOUNT_RE = /^\d{1,8}(\.\d{1,2})?$/;

export function FundGigPage() {
  const { actor, setActor } = useActor();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();

  const [freelancer, setFreelancer] = useState(null);
  const [budget, setBudget] = useState('');
  const [startNow, setStartNow] = useState(true);
  const [result, setResult] = useState(null);

  // ?freelancer=<id> from a freelancer page pre-fills the picker
  const preset = params.get('freelancer');
  const presetQ = useQuery({
    queryKey: ['freelancers', 'detail', preset],
    queryFn: () => api.get(`/api/freelancers/${preset}`),
    enabled: Boolean(preset) && !freelancer,
  });
  const chosen = freelancer || presetQ.data || null;

  const clientQ = useQuery({
    queryKey: ['clients', 'detail', actor?.id],
    queryFn: () => api.get(`/api/clients/${actor.id}`),
    enabled: Boolean(actor),
  });

  const refreshEverything = () =>
    ['clients', 'freelancers', 'contracts', 'escrow', 'analytics'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  const fund = useMutation({
    mutationFn: (body) => api.post('/api/gigs/fund', body),
    onSuccess: (data) => {
      setResult({ kind: 'success', data, at: Date.now() });
      refreshEverything();
    },
    onError: (error) => setResult({ kind: 'error', error, at: Date.now() }),
  });

  const amountValid = AMOUNT_RE.test(budget) && Number(budget) <= MAX_AMOUNT;
  const canSubmit = actor && chosen?.id && amountValid && !fund.isPending;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setResult(null);
    fund.mutate({ clientId: actor.id, freelancerId: chosen.id, budget, startNow });
  };

  if (!actor) {
    return (
      <>
        <PageHeader title="Fund a gig" description="A client moves money from escrow into a new contract." />
        <Card title="Which client is funding?">
          <p>Choose a client to act as. (A demo switch, not a login.)</p>
          <ClientSearch value={null} onSelect={setActor} />
        </Card>
      </>
    );
  }

  const client = clientQ.data;

  return (
    <>
      <PageHeader
        title="Fund a gig"
        description="Calls the stored procedure fund_gig inside a REPEATABLE READ transaction. The database enforces every rule."
      />

      <div className="grid-checkout">
        <Card title="New contract">
          <form onSubmit={submit} className="form" noValidate>
            <Field label="Client">
              <div className="readonly-field">
                {actor.name}
                <span className="muted"> (change with “Acting as client” at the top)</span>
              </div>
            </Field>

            <Field label="Freelancer" htmlFor="fund-freelancer">
              <FreelancerSearch id="fund-freelancer" value={chosen} onSelect={setFreelancer} />
            </Field>
            {chosen && (
              <div className="muted">
                <FreelancerState f={chosen} /> <Link to={`/freelancers/${chosen.id}`}>profile</Link>
              </div>
            )}

            <Field
              label="Budget (₹)"
              htmlFor="fund-budget"
              hint={budget && !amountValid ? 'Use a number with at most 2 decimals, up to 99,999,999.99.' : 'Moved from escrow into the contract.'}
            >
              <input
                id="fund-budget"
                className={`input ${budget && !amountValid ? 'input-invalid' : ''}`}
                inputMode="decimal"
                placeholder="e.g. 1500"
                value={budget}
                onChange={(e) => setBudget(e.target.value.trim())}
                aria-invalid={Boolean(budget) && !amountValid}
              />
            </Field>

            <div className="chip-row" aria-label="Quick budgets">
              {QUICK_BUDGETS.map((a) => (
                <button key={a} type="button" className="chip" onClick={() => setBudget(a)}>
                  {formatMoney(a)}
                </button>
              ))}
              {client && (
                <button
                  type="button"
                  className="chip chip-warning"
                  title="Demonstrates the insufficient-escrow failure"
                  onClick={() => setBudget(Math.min(MAX_AMOUNT, Number(client.escrow_balance) + 500).toFixed(2))}
                >
                  More than escrow
                </button>
              )}
            </div>

            <label className="checkbox-card">
              <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} />
              <span>
                <strong>Start work now</strong>
                <span className="muted">
                  Also moves the contract to IN_PROGRESS in the same transaction. If this freelancer already has a gig in
                  progress, the partial unique index refuses and nothing is charged.
                </span>
              </span>
            </label>

            <Button type="submit" loading={fund.isPending} disabled={!canSubmit}>
              Fund gig
            </Button>
          </form>
        </Card>

        <Card title="Escrow right now" subtitle="clients.escrow_balance">
          {clientQ.isPending && <Loading />}
          {clientQ.isError && <ErrorState error={clientQ.error} onRetry={() => clientQ.refetch()} />}
          {client && (
            <>
              <p className="big-number">
                <Money value={client.escrow_balance} />
              </p>
              <DetailList
                items={[
                  ['Funded, not started', client.stats.funded],
                  ['In progress', client.stats.in_progress],
                  ['Completed', client.stats.completed],
                ]}
              />
            </>
          )}
        </Card>
      </div>

      {result?.kind === 'success' && <FundSuccess key={result.at} data={result.data} />}
      {result?.kind === 'error' && <FundFailure key={result.at} error={result.error} actor={actor} onFixed={refreshEverything} />}
    </>
  );
}

function FundSuccess({ data }) {
  const [contract, setContract] = useState(data.contract);
  const charged = Number(data.balanceBefore) - Number(data.balanceAfter);

  return (
    <section className="result result-success" aria-live="polite">
      <h2>Gig funded</h2>
      <div className="before-after">
        <div>
          <span className="stat-label">Escrow before</span>
          <span className="big-number">
            <Money value={data.balanceBefore} />
          </span>
        </div>
        <span className="arrow" aria-hidden="true">→</span>
        <div>
          <span className="stat-label">Escrow after</span>
          <span className="big-number">
            <Money value={data.balanceAfter} />
          </span>
        </div>
        <div>
          <span className="stat-label">Moved into contract</span>
          <span className="big-number money-neg">−{formatMoney(charged)}</span>
        </div>
      </div>

      <div className="grid-2">
        <Card title="New contract" subtitle={`Inserted by fund_gig · ${shortId(contract?.id)}`}>
          {contract && (
            <>
              <DetailList
                items={[
                  ['Freelancer', contract.freelancer_name],
                  ['Budget', <Money key="b" value={contract.budget} />],
                  ['Funded', formatDateTime(contract.created_at)],
                ]}
              />
              <ContractStatusControl contract={contract} onChanged={setContract} />
            </>
          )}
        </Card>

        <Card title="New wallet_audit_logs row" subtitle="Written by trigger trg_wallet_audit — the API never inserts audit rows">
          {data.auditEntry ? (
            <DetailList
              items={[
                ['id', <code key="i">{data.auditEntry.id}</code>],
                ['action_type', <span key="t" className="badge badge-debit">{data.auditEntry.action_type}</span>],
                ['amount_changed', <Money key="m" value={data.auditEntry.amount_changed} signed />],
                ['balance_after', <Money key="b" value={data.auditEntry.balance_after} />],
                ['created_at', formatDateTime(data.auditEntry.created_at)],
              ]}
            />
          ) : (
            <Alert tone="danger">No audit row was found for this transaction — the trigger did not fire.</Alert>
          )}
          <Link to="/escrow" className="btn btn-secondary btn-sm">
            Open the escrow audit trail
          </Link>
        </Card>
      </div>
    </section>
  );
}

function FundFailure({ error, actor, onFixed }) {
  const queryClient = useQueryClient();
  const topUp = useMutation({
    mutationFn: (amount) => api.post(`/api/clients/${actor.id}/topup`, { amount }),
    onSuccess: () => {
      onFixed();
      queryClient.invalidateQueries({ queryKey: ['clients', 'detail', actor.id] });
    },
  });

  if (error.code === 'INSUFFICIENT_BALANCE') {
    const { balance, requested } = error.details || {};
    const shortfall = Math.max(0, Number(requested) - Number(balance));
    const topUpAmount = Math.min(MAX_AMOUNT, Math.ceil(shortfall * 100) / 100).toFixed(2);
    const canTopUp = Number(balance) + Number(topUpAmount) <= MAX_AMOUNT;
    return (
      <section className="result result-error" role="alert">
        <h2>Not enough money in escrow</h2>
        <p>{error.message}</p>
        <DetailList
          items={[
            ['Escrow balance', <Money key="b" value={balance} />],
            ['Gig budget', <Money key="r" value={requested} />],
            ['Short by', <span key="s" className="money money-neg">{formatMoney(shortfall)}</span>],
          ]}
        />
        <p className="muted">
          Raised by <code>fund_gig</code> after it locked the client row (<code>FOR UPDATE</code>). The transaction was rolled
          back: no contract and no audit row exist.
        </p>
        {canTopUp ? (
          <div>
            <Button variant="secondary" loading={topUp.isPending} onClick={() => topUp.mutate(topUpAmount)}>
              Top up {formatMoney(topUpAmount)} (writes a CREDIT audit row)
            </Button>
          </div>
        ) : (
          <p className="muted">That budget is above what an escrow balance can hold, so a top-up is not offered.</p>
        )}
        {topUp.isSuccess && (
          <Alert tone="success">
            Escrow is now <Money value={topUp.data.balanceAfter} />. Press “Fund gig” again.
          </Alert>
        )}
        {topUp.isError && <Alert tone="danger">{topUp.error.message}</Alert>}
      </section>
    );
  }

  if (error.code === 'GIG_ALREADY_IN_PROGRESS') {
    const active = error.details?.activeContract;
    return (
      <section className="result result-error" role="alert">
        <h2>This freelancer already has a gig in progress</h2>
        <p>{error.message} Nothing was charged.</p>
        <p className="muted">
          Refused by the partial unique index <code>idx_active_gig</code> on{' '}
          <code>contracts(freelancer_id) WHERE status = &apos;IN_PROGRESS&apos;</code>. The escrow debit made earlier in the
          same transaction was rolled back. Untick “Start work now” to fund the gig anyway and start it later.
        </p>
        {active && <BlockingContract contract={active} onCleared={onFixed} />}
      </section>
    );
  }

  return (
    <section className="result result-error" role="alert">
      <h2>The gig was not funded</h2>
      <p>{error.message}</p>
      {error.code && <p className="muted">Code: {error.code}</p>}
    </section>
  );
}
