import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

const Subscriptions = () => {
  const [data, setData] = useState({
    totalMrr: 0,
    activeSubscribers: 0,
    renewals: []
  });
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    try {
      const res = await apiClient.get('/super/subscriptions');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const totalMrr = data.totalMrr;
  const activeSubscribers = data.activeSubscribers;
  const avgArpu = activeSubscribers > 0 ? Math.round(totalMrr / activeSubscribers) : 0;

  return (
    <div>
      <Topbar
        title="Subscription Management"
        actions={
          <div className="flex gap-2">
            <button className="btn-outline text-xs">Export Report</button>
            <button className="btn-primary text-xs">+ Create New Plan</button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total MRR', value: `Rs. ${totalMrr.toLocaleString()}`, change: 'Real-time' },
          { label: 'Active Subscribers', value: activeSubscribers.toString(), change: 'Platform Stats' },
          { label: 'Avg. Revenue / User', value: `Rs. ${avgArpu.toLocaleString()}`, change: 'Computed' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-green-500 font-semibold">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="card mb-6">
        <h3 className="font-display font-semibold text-primary mb-4">Active Plan Configuration</h3>
        <div className="grid grid-cols-2 gap-6">
          {[
            {
              tier: 'TIER 1',
              name: 'Standard Plan',
              price: '12,000',
              students: '500 Students',
              storage: '50 GB',
              revenue: 'Rs. 499/mo'
            },
            {
              tier: 'TIER 2',
              name: 'Enterprise Plan',
              price: '15,000',
              students: 'Unlimited',
              storage: '2 TB',
              revenue: 'Custom /mo',
              top: true
            },
          ].map(p => (
            <div key={p.name} className={`border-2 rounded-xl p-5 relative ${p.top ? 'border-accent bg-accent/5' : 'border-gray-200'}`}>
              {p.top && (
                <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-0.5 rounded-full">TOP REVENUE</div>
              )}
              <div className="text-xs font-bold text-gray-400 mb-1">{p.tier}</div>
              <div className="font-display font-bold text-primary text-xl mb-3">{p.name}</div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500">Implementation Cost (Rs.)</span>
                <span className="font-bold">{p.price}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500">Student Capacity</span>
                <span className="font-bold">{p.students}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-gray-500">Storage Limit</span>
                <span className="font-bold">{p.storage}</span>
              </div>
              <div className="font-display font-bold text-primary text-lg mb-3">{p.revenue}</div>
              <button className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-all">Save Updates</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-primary mb-4">Recent Subscription Renewals</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-th">Institution Name</th>
              <th className="table-th">Plan Type</th>
              <th className="table-th">Amount</th>
              <th className="table-th">Method</th>
              <th className="table-th">Renew Date</th>
              <th className="table-th">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.renewals.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-td font-semibold text-primary">{r.institutionName}</td>
                <td className="table-td"><span className="badge badge-gray">{r.planType}</span></td>
                <td className="table-td font-medium">Rs. {r.amount}</td>
                <td className="table-td text-gray-500">Stripe</td>
                <td className="table-td text-gray-500">{r.renewDate}</td>
                <td className="table-td"><span className={r.status === 'success' ? 'badge-success' : 'badge-danger'}>{r.status.toUpperCase()}</span></td>
              </tr>
            ))}
            {data.renewals.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No renewals found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Subscriptions;