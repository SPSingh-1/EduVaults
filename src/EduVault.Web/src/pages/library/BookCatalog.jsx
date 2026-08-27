import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  BookOpen, 
  Plus, 
  Upload, 
  Download, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Sparkles,
  Layers
} from 'lucide-react';

const BookCatalog = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    category: 'General',
    totalCopies: 1,
    shelfLocation: 'A1'
  });

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/library/books');
      setBooks(res.data || []);
    } catch (err) {
      console.error('Failed to load books:', err);
      setError('Failed to load books.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSaveBook = async (e) => {
    e.preventDefault();
    if (!form.title || !form.author) {
      setError('Title and Author are required.');
      return;
    }
    setError('');
    try {
      if (editingBook) {
        await apiClient.put(`/library/books/${editingBook.id}`, {
          ...form,
          totalCopies: parseInt(form.totalCopies)
        });
        setSuccess('Book details updated.');
      } else {
        await apiClient.post('/library/books', {
          ...form,
          totalCopies: parseInt(form.totalCopies)
        });
        setSuccess('New book added to catalog.');
      }
      setShowAddModal(false);
      setEditingBook(null);
      setForm({ isbn: '', title: '', author: '', publisher: '', category: 'General', totalCopies: 1, shelfLocation: 'A1' });
      fetchBooks();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save book.');
    }
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm('Are you sure you want to remove this book?')) return;
    try {
      await apiClient.delete(`/library/books/${id}`);
      setSuccess('Book removed from library.');
      fetchBooks();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete book.');
    }
  };

  const handleImportCsv = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setError('Please select a .csv file.');
      return;
    }
    setImporting(true);
    setError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await apiClient.post('/library/books/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      setSuccess(`Successfully imported ${res.data.importedCount} books from CSV.`);
      fetchBooks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import CSV file.');
    } finally {
      setImporting(false);
    }
  };

  const filtered = books.filter(b => {
    const s = search.toLowerCase();
    const matchesSearch = 
      (b.title || '').toLowerCase().includes(s) ||
      (b.author || '').toLowerCase().includes(s) ||
      (b.isbn || '').toLowerCase().includes(s) ||
      (b.shelfLocation || '').toLowerCase().includes(s);

    const matchesCategory = categoryFilter === 'ALL' || (b.category || '').toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const categories = ['ALL', ...new Set(books.map(b => b.category || 'General'))];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Book Inventory Catalog" subtitle="Manage School Books, Shelf Locations & CSV Bulk Import" />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner Hero */}
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-cyan-400 shrink-0" />
              Library Book Catalog
            </h1>
            <p className="text-sm text-cyan-200/90 max-w-xl">
              Track copy availability, shelf positions, categories, and easily import large collections via standard CSV spreadsheets.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setShowImportModal(true);
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Bulk CSV Import
            </button>

            <button
              onClick={() => {
                setEditingBook(null);
                setForm({ isbn: '', title: '', author: '', publisher: '', category: 'General', totalCopies: 1, shelfLocation: 'A1' });
                setShowAddModal(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Single Book
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-700 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-semibold">{success}</p>
          </div>
        )}

        {/* Catalog Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search title, author, ISBN, shelf..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center"><Loader /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No Books Found</p>
              <p className="text-xs text-slate-400">Add a book or import your school collection via CSV.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-6">BOOK TITLE & AUTHOR</th>
                    <th className="py-3.5 px-4">ISBN</th>
                    <th className="py-3.5 px-4">CATEGORY</th>
                    <th className="py-3.5 px-4">SHELF</th>
                    <th className="py-3.5 px-4 text-center">COPIES AVAILABLE</th>
                    <th className="py-3.5 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{b.title}</div>
                        <div className="text-xs text-slate-500 font-medium">by {b.author} {b.publisher && `• ${b.publisher}`}</div>
                      </td>

                      <td className="py-4 px-4 font-mono text-xs text-slate-600">
                        {b.isbn || 'N/A'}
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-2xs font-bold">
                          {b.category || 'General'}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono text-xs font-bold text-slate-700">
                        {b.shelfLocation || 'A1'}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className={`font-mono font-bold text-sm ${b.availableCopies > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {b.availableCopies}
                        </span>
                        <span className="text-3xs text-slate-400 block font-medium">
                          of {b.totalCopies} total
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingBook(b);
                            setForm({
                              isbn: b.isbn,
                              title: b.title,
                              author: b.author,
                              publisher: b.publisher || '',
                              category: b.category || 'General',
                              totalCopies: b.totalCopies,
                              shelfLocation: b.shelfLocation || 'A1'
                            });
                            setShowAddModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(b.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 text-left">
            <div className="bg-gradient-to-r from-cyan-900 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base">
                {editingBook ? 'Edit Book Information' : 'Add New Book to Inventory'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveBook} className="p-6 space-y-4">
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Book Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. The Discovery of India"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Author *</label>
                  <input
                    type="text"
                    required
                    value={form.author}
                    onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
                    placeholder="e.g. Jawaharlal Nehru"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Publisher</label>
                  <input
                    type="text"
                    value={form.publisher}
                    onChange={e => setForm(p => ({ ...p, publisher: e.target.value }))}
                    placeholder="e.g. Oxford Press"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">ISBN Number</label>
                  <input
                    type="text"
                    value={form.isbn}
                    onChange={e => setForm(p => ({ ...p, isbn: e.target.value }))}
                    placeholder="978-..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    placeholder="History, Science..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Shelf Location</label>
                  <input
                    type="text"
                    value={form.shelfLocation}
                    onChange={e => setForm(p => ({ ...p, shelfLocation: e.target.value }))}
                    placeholder="e.g. B2-04"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Total Copies</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.totalCopies}
                  onChange={e => setForm(p => ({ ...p, totalCopies: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black uppercase rounded-xl">Save Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 text-left">
            <div className="bg-gradient-to-r from-cyan-900 to-teal-900 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Upload className="w-5 h-5 text-cyan-300" />
                  Bulk Import Books from CSV
                </h3>
                <p className="text-xs text-cyan-200 mt-0.5">Upload a standard .csv formatted file</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleImportCsv} className="p-6 space-y-5">
              {/* Template Download Prompt */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-cyan-600" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Sample CSV Template</span>
                    <span className="text-3xs text-slate-400">Contains required headers: ISBN, Title, Author...</span>
                  </div>
                </div>
                <a
                  href="/book-import-template.csv"
                  download="book-import-template.csv"
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-cyan-500 text-cyan-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .csv
                </a>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Select .CSV Spreadsheet *
                </label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 cursor-pointer border border-slate-200 rounded-xl p-1"
                />
              </div>

              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Successfully imported {importResult.importedCount} books!
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="text-3xs text-rose-700 space-y-1 mt-2">
                      <span className="font-bold">Errors encountered:</span>
                      {(importResult.errors || []).map((err, i) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Close</button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {importing ? 'Importing CSV...' : 'Upload & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookCatalog;
