const STORAGE_KEY = 'bendahara-transactions-v1';
const categories = {
  income: ['Iuran', 'Donasi', 'Penjualan', 'Bantuan', 'Lainnya'],
  expense: ['Operasional', 'Perlengkapan', 'Konsumsi', 'Transportasi', 'Kegiatan', 'Lainnya']
};
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const dateLabel = (value) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
let transactions = loadTransactions();
let editingId = null;
let toastTimer;

function loadTransactions() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item && typeof item.id === 'string' && ['income', 'expense'].includes(item.type) && Number.isSafeInteger(item.amount) && item.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) : [];
  } catch { return []; }
}
function saveTransactions() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); return true; }
  catch { showToast('Penyimpanan browser penuh atau tidak tersedia.'); return false; }
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
function submitForm(event) {
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
  const item = { id: old?.id || crypto.randomUUID(), createdAt: old?.createdAt || Date.now(), type: form.elements.type.value, date, amount, category: $('#category').value, description, note };
  const previous = transactions;
  transactions = old ? transactions.map((entry) => entry.id === old.id ? item : entry) : [...transactions, item];
  if (!saveTransactions()) { transactions = previous; return; }
  closeForm(); render(); showToast(old ? 'Transaksi berhasil diubah.' : 'Transaksi berhasil ditambahkan.');
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
$('#transactionRows').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  const item = transactions.find((entry) => entry.id === button.dataset.id); if (!item) return;
  if (button.dataset.action === 'edit') openForm(item);
  else if (window.confirm(`Hapus transaksi “${item.description}”?`)) { const previous = transactions; transactions = transactions.filter((entry) => entry.id !== item.id); if (!saveTransactions()) { transactions = previous; return; } render(); showToast('Transaksi berhasil dihapus.'); }
});
render();
