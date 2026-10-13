const categories = {
  income: ['Iuran', 'Donasi', 'Penjualan', 'Bantuan', 'Lainnya'],
  expense: ['Operasional', 'Perlengkapan', 'Konsumsi', 'Transportasi', 'Kegiatan', 'Lainnya']
};
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const dateLabel = (value) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
let transactions = [];
let editingId = null;
let toastTimer;

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result.error || 'Permintaan gagal. Coba lagi.'); error.status = response.status; throw error; }
  return result;
}
function showDashboard(user) {
  $('#currentUsername').textContent = user.username;
  $('#loginScreen').hidden = true;
  $('#dashboard').hidden = false;
}
function showLogin() {
  transactions = []; render();
  $('#dashboard').hidden = true;
  $('#loginScreen').hidden = false;
  $('#password').value = '';
}
async function refreshTransactions() {
  const data = await api('/api/transactions');
  transactions = data.transactions;
  render();
}
async function initialize() {
  try {
    const data = await api('/api/auth/me');
    showDashboard(data.user);
    await refreshTransactions();
  } catch (error) {
    if (error.status === 401) showLogin();
    else { showLogin(); $('#loginError').textContent = 'Tidak dapat memuat data. Periksa koneksi lalu coba lagi.'; $('#loginError').hidden = false; }
  }
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
function updateCategories(selected) {
  const type = $('input[name="type"]:checked').value;
  const category = $('#category'); category.replaceChildren();
  categories[type].forEach((name) => { const option = document.createElement('option'); option.value = name; option.textContent = name; category.append(option); });
  if (selected && categories[type].includes(selected)) category.value = selected;
}
function filteredTransactions() {
  const query = $('#search').value.trim().toLocaleLowerCase('id-ID');
  const month = $('#month').value;
  const type = $('#typeFilter').value;
  return transactions.filter((item) => (!month || item.date.startsWith(month)) && (type === 'all' || item.type === type) && (!query || [item.description, item.category, item.note || ''].some((field) => field.toLocaleLowerCase('id-ID').includes(query))))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}
function render() {
  const items = filteredTransactions();
  const incomeItems = items.filter((item) => item.type === 'income');
  const expenseItems = items.filter((item) => item.type === 'expense');
  const income = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const expense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  $('#balance').textContent = money(income - expense);
  $('#income').textContent = money(income);
  $('#expense').textContent = money(expense);
  $('#incomeCount').textContent = `${incomeItems.length} transaksi masuk`;
  $('#expenseCount').textContent = `${expenseItems.length} transaksi keluar`;
  $('#countText').textContent = `${items.length} transaksi ditampilkan${items.length !== transactions.length ? ` dari ${transactions.length}` : ''}`;
  const rows = $('#transactionRows'); rows.replaceChildren();
  for (const item of items) {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    const title = document.createElement('span'); title.className = 'tx-name'; title.textContent = item.description; name.append(title);
    if (item.note) { const note = document.createElement('span'); note.className = 'tx-note'; note.textContent = item.note; name.append(note); }
    const date = document.createElement('td'); date.textContent = dateLabel(item.date);
    const category = document.createElement('td'); const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = item.category; category.append(badge);
    const amount = document.createElement('td'); amount.className = item.type === 'income' ? 'amount-income' : 'amount-expense'; amount.textContent = `${item.type === 'income' ? '+' : '−'} ${money(item.amount)}`;
    const actions = document.createElement('td'); const group = document.createElement('div'); group.className = 'row-actions';
    for (const [label, action] of [['Ubah', 'edit'], ['Hapus', 'delete']]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.setAttribute('aria-label', `${label} ${item.description}`); button.dataset.action = action; button.dataset.id = item.id; group.append(button); }
    actions.append(group); row.append(name, date, category, amount, actions); rows.append(row);
  }
  $('#emptyState').hidden = items.length > 0;
  $('.table-wrap').hidden = items.length === 0;
  $('#exportButton').disabled = items.length === 0;
}
function openForm(item = null) {
  editingId = item?.id || null;
  const form = $('#transactionForm'); form.reset(); $('#formError').hidden = true;
  $('#dialogTitle').textContent = item ? 'Ubah transaksi' : 'Tambah transaksi';
  $(`input[name="type"][value="${item?.type || 'income'}"]`).checked = true;
  updateCategories(item?.category);
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  $('#date').value = item?.date || localDate;
  $('#amount').value = item?.amount || '';
  $('#description').value = item?.description || '';
  $('#note').value = item?.note || '';
  $('#transactionDialog').showModal();
  $('#description').focus();
}
function closeForm() { $('#transactionDialog').close(); editingId = null; }
async function submitForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const amount = Number($('#amount').value);
  const date = $('#date').value;
  const description = $('#description').value.trim();
  const note = $('#note').value.trim();
  const error = $('#formError');
  if (!Number.isSafeInteger(amount) || amount <= 0 || !description || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { error.textContent = 'Isi tanggal, nominal bulat lebih dari nol, dan keterangan.'; error.hidden = false; return; }
  const old = transactions.find((item) => item.id === editingId);
  const item = { type: form.elements.type.value, date, amount, category: $('#category').value, description, note };
  const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
  try {
    await api(old ? `/api/transactions/${encodeURIComponent(old.id)}` : '/api/transactions', { method: old ? 'PATCH' : 'POST', body: JSON.stringify(item) });
    await refreshTransactions(); closeForm(); showToast(old ? 'Transaksi berhasil diubah.' : 'Transaksi berhasil ditambahkan.');
  } catch (failure) { error.textContent = failure.message; error.hidden = false; if (failure.status === 401) showLogin(); }
  finally { submit.disabled = false; }
}
function escapeCsv(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function exportCsv() {
  const rows = filteredTransactions(); if (!rows.length) return;
  const fields = [['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Catatan', 'Pemasukan', 'Pengeluaran'], ...rows.map((item) => [item.date, item.type === 'income' ? 'Pemasukan' : 'Pengeluaran', item.category, item.description, item.note, item.type === 'income' ? item.amount : '', item.type === 'expense' ? item.amount : ''])];
  const csv = '\uFEFF' + fields.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const today = new Date(); const dateStamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const link = document.createElement('a'); link.href = url; link.download = `transaksi-bendahara-${dateStamp}.csv`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`${rows.length} transaksi diunduh sebagai CSV.`);
}
$('#addButton').addEventListener('click', () => openForm());
$('#emptyAddButton').addEventListener('click', () => openForm());
$('#closeDialog').addEventListener('click', closeForm);
$('#cancelButton').addEventListener('click', closeForm);
$('#transactionDialog').addEventListener('click', (event) => { if (event.target === event.currentTarget) closeForm(); });
document.querySelectorAll('input[name="type"]').forEach((input) => input.addEventListener('change', () => updateCategories()));
$('#transactionForm').addEventListener('submit', submitForm);
for (const selector of ['#search', '#month', '#typeFilter']) $(selector).addEventListener('input', render);
$('#exportButton').addEventListener('click', exportCsv);
$('#transactionRows').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  const item = transactions.find((entry) => entry.id === button.dataset.id); if (!item) return;
  if (button.dataset.action === 'edit') openForm(item);
  else if (window.confirm(`Hapus transaksi “${item.description}”?`)) {
    try { await api(`/api/transactions/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); await refreshTransactions(); showToast('Transaksi berhasil dihapus.'); }
    catch (failure) { showToast(failure.message); if (failure.status === 401) showLogin(); }
  }
});
$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = $('#loginError'); error.hidden = true;
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: $('#username').value.trim(), password: $('#password').value }) });
    showDashboard(data.user); $('#password').value = ''; await refreshTransactions();
  } catch (failure) { error.textContent = failure.message; error.hidden = false; }
  finally { button.disabled = false; }
});
async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); showLogin(); showToast('Anda telah keluar.'); }
  catch (error) { showToast(error.message); }
}
$('#logoutButton').addEventListener('click', logout);
$('#mobileLogoutButton').addEventListener('click', logout);
initialize();
