import './style.css'

const app = document.querySelector('#app')

const seedState = {
  groupName: 'Goa Escape',
  simplifyDebts: true,
  members: ['Ankit', 'Riya', 'Kabir', 'Maya'],
  expenses: [
    { id: crypto.randomUUID(), description: 'Villa booking', amount: 24000, paidBy: 'Ankit', splitBetween: ['Ankit', 'Riya', 'Kabir', 'Maya'] },
    { id: crypto.randomUUID(), description: 'Scooter rental', amount: 4800, paidBy: 'Riya', splitBetween: ['Ankit', 'Riya', 'Kabir'] },
    { id: crypto.randomUUID(), description: 'Seafood dinner', amount: 3600, paidBy: 'Kabir', splitBetween: ['Ankit', 'Riya', 'Kabir', 'Maya'] },
  ],
  form: {
    description: '',
    amount: '',
    paidBy: 'Ankit',
    splitBetween: ['Ankit', 'Riya', 'Kabir', 'Maya'],
  },
}

const state = structuredClone(seedState)

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

const evenlySplit = (amount, people) => people.length ? amount / people.length : 0

const computeBalances = () => {
  const balances = Object.fromEntries(state.members.map((member) => [member, 0]))

  for (const expense of state.expenses) {
    const amount = Number(expense.amount)
    const participants = expense.splitBetween
    const share = evenlySplit(amount, participants)

    balances[expense.paidBy] += amount
    for (const member of participants) balances[member] -= share
  }

  for (const member of Object.keys(balances)) {
    balances[member] = Math.round((balances[member] + Number.EPSILON) * 100) / 100
  }

  return balances
}

const simplifySettlements = (balances) => {
  const creditors = Object.entries(balances)
    .filter(([, balance]) => balance > 0.009)
    .map(([name, balance]) => ({ name, amount: balance }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(balances)
    .filter(([, balance]) => balance < -0.009)
    .map(([name, balance]) => ({ name, amount: Math.abs(balance) }))
    .sort((a, b) => b.amount - a.amount)

  const settlements = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const payment = Math.min(debtor.amount, creditor.amount)
    const roundedPayment = Math.round((payment + Number.EPSILON) * 100) / 100

    settlements.push({ from: debtor.name, to: creditor.name, amount: roundedPayment })

    debtor.amount = Math.round((debtor.amount - payment + Number.EPSILON) * 100) / 100
    creditor.amount = Math.round((creditor.amount - payment + Number.EPSILON) * 100) / 100

    if (debtor.amount <= 0.009) i += 1
    if (creditor.amount <= 0.009) j += 1
  }

  return settlements
}

const directDebts = () => {
  const ledger = {}

  for (const expense of state.expenses) {
    const amount = Number(expense.amount)
    const participants = expense.splitBetween.filter((member) => member !== expense.paidBy)
    const share = evenlySplit(amount, expense.splitBetween)

    for (const member of participants) {
      const key = `${member}__${expense.paidBy}`
      ledger[key] = (ledger[key] || 0) + share
    }
  }

  return Object.entries(ledger).map(([key, amount]) => {
    const [from, to] = key.split('__')
    return { from, to, amount: Math.round((amount + Number.EPSILON) * 100) / 100 }
  }).filter(({ amount }) => amount > 0.009)
}

const totals = () => {
  const total = state.expenses.reduce((sum, item) => sum + Number(item.amount), 0)
  return {
    total,
    perPerson: state.members.length ? total / state.members.length : 0,
    expenses: state.expenses.length,
  }
}

const render = () => {
  const balances = computeBalances()
  const settlements = state.simplifyDebts ? simplifySettlements(balances) : directDebts()
  const summary = totals()

  app.innerHTML = `
    <main class="shell">
      <section class="hero">
        <div>
          <p class="eyebrow">Splitwise-style flow, minus the corporate beige</p>
          <h1>${state.groupName}</h1>
          <p class="sub">Create a group, add members, log who paid, split bills across selected people, then settle up. With <strong>Simplified Debts</strong> on, the app minimizes the number of payments without changing what anyone owes overall.</p>
        </div>
        <div class="hero-stats">
          <div><span>Total spent</span><strong>${currency.format(summary.total)}</strong></div>
          <div><span>Expenses</span><strong>${summary.expenses}</strong></div>
          <div><span>Average / person</span><strong>${currency.format(summary.perPerson)}</strong></div>
        </div>
      </section>

      <section class="grid">
        <div class="card">
          <div class="card-head">
            <div>
              <h2>1. Group members</h2>
              <p>Add the people trapped in this financial opera.</p>
            </div>
          </div>
          <div class="chip-row">
            ${state.members.map((member) => `<span class="chip">${member}</span>`).join('')}
          </div>
          <div class="member-row">
            <input id="memberInput" placeholder="Add a member" />
            <button id="addMemberBtn">Add</button>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <h2>2. Add an expense</h2>
              <p>Exactly the core Splitwise rhythm: what was bought, how much, who paid, who shared it.</p>
            </div>
          </div>

          <div class="form-grid">
            <label>
              <span>Description</span>
              <input id="description" value="${state.form.description}" placeholder="Dinner, rent, taxi…" />
            </label>
            <label>
              <span>Amount</span>
              <input id="amount" type="number" min="0" step="0.01" value="${state.form.amount}" placeholder="0.00" />
            </label>
            <label>
              <span>Paid by</span>
              <select id="paidBy">
                ${state.members.map((member) => `<option value="${member}" ${state.form.paidBy === member ? 'selected' : ''}>${member}</option>`).join('')}
              </select>
            </label>
          </div>

          <div>
            <p class="mini-label">Split between</p>
            <div class="checkbox-grid">
              ${state.members.map((member) => `
                <label class="checkbox">
                  <input type="checkbox" data-member="${member}" ${state.form.splitBetween.includes(member) ? 'checked' : ''} />
                  <span>${member}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="split-note">
            ${state.form.splitBetween.length ? `Each selected person owes <strong>${currency.format(evenlySplit(Number(state.form.amount || 0), state.form.splitBetween))}</strong>.` : 'Pick at least one person to split the expense.'}
          </div>

          <button id="addExpenseBtn" class="primary">Add expense</button>
        </div>

        <div class="card tall">
          <div class="card-head">
            <div>
              <h2>3. Balances</h2>
              <p>Positive means they should receive money. Negative means they owe.</p>
            </div>
          </div>
          <div class="balance-list">
            ${state.members.map((member) => `
              <div class="balance-row">
                <span>${member}</span>
                <strong class="${balances[member] >= 0 ? 'plus' : 'minus'}">${balances[member] >= 0 ? '+' : ''}${currency.format(balances[member])}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card wide">
          <div class="card-head">
            <div>
              <h2>4. Settle up</h2>
              <p>${state.simplifyDebts ? 'Simplified debts is ON: fewer payments, same net result.' : 'Simplified debts is OFF: direct obligations remain attached to each expense payer.'}</p>
            </div>
            <label class="toggle">
              <input id="simplifyToggle" type="checkbox" ${state.simplifyDebts ? 'checked' : ''} />
              <span>Simplified debts</span>
            </label>
          </div>

          <div class="explain">
            <strong>How simplified debts works:</strong> it uses final net balances for the whole group, then matches debtors to creditors greedily so the group needs the fewest practical payments. Nobody pays more; the graph just gets less annoying.
          </div>

          <div class="settlement-list">
            ${settlements.length ? settlements.map(({ from, to, amount }) => `
              <div class="settlement">
                <span><strong>${from}</strong> pays <strong>${to}</strong></span>
                <b>${currency.format(amount)}</b>
              </div>
            `).join('') : '<p class="empty">All settled. A rare and suspicious peace.</p>'}
          </div>
        </div>

        <div class="card wide">
          <div class="card-head">
            <div>
              <h2>Expense activity</h2>
              <p>The running ledger.</p>
            </div>
          </div>
          <div class="expense-list">
            ${state.expenses.map((expense) => `
              <div class="expense">
                <div>
                  <strong>${expense.description}</strong>
                  <p>${expense.paidBy} paid ${currency.format(expense.amount)} · split among ${expense.splitBetween.join(', ')}</p>
                </div>
                <button class="ghost" data-remove="${expense.id}">Remove</button>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    </main>
  `

  document.querySelector('#memberInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      document.querySelector('#addMemberBtn')?.click()
    }
  })

  document.querySelector('#addMemberBtn')?.addEventListener('click', () => {
    const input = document.querySelector('#memberInput')
    const name = input.value.trim()
    if (!name || state.members.includes(name)) return
    state.members.push(name)
    state.form.splitBetween.push(name)
    render()
  })

  document.querySelector('#description')?.addEventListener('input', (e) => { state.form.description = e.target.value })
  document.querySelector('#amount')?.addEventListener('input', (e) => { state.form.amount = e.target.value })
  document.querySelector('#paidBy')?.addEventListener('change', (e) => { state.form.paidBy = e.target.value })
  document.querySelectorAll('[data-member]').forEach((box) => box.addEventListener('change', (e) => {
    const member = e.target.dataset.member
    if (e.target.checked) {
      if (!state.form.splitBetween.includes(member)) state.form.splitBetween.push(member)
    } else {
      state.form.splitBetween = state.form.splitBetween.filter((item) => item !== member)
    }
    render()
  }))

  document.querySelector('#simplifyToggle')?.addEventListener('change', (e) => {
    state.simplifyDebts = e.target.checked
    render()
  })

  document.querySelector('#addExpenseBtn')?.addEventListener('click', () => {
    const amount = Number(state.form.amount)
    if (!state.form.description.trim() || !amount || amount <= 0 || !state.form.splitBetween.length) return

    state.expenses.unshift({
      id: crypto.randomUUID(),
      description: state.form.description.trim(),
      amount,
      paidBy: state.form.paidBy,
      splitBetween: [...state.form.splitBetween],
    })

    state.form.description = ''
    state.form.amount = ''
    render()
  })

  document.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', (e) => {
    state.expenses = state.expenses.filter((expense) => expense.id !== e.target.dataset.remove)
    render()
  }))
}

render()
