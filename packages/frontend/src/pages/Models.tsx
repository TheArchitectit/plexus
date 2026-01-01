import React, { useEffect, useState } from 'react';
import { api, Model } from '../lib/api';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Search } from 'lucide-react';

export const Models = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getModels().then(setModels);
  }, []);

  const filteredModels = models.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Models</h1>
        <p className="page-description">Available AI models across providers.</p>
      </div>

      <Card className="mb-6">
           <div style={{position: 'relative'}}>
              <Search size={16} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)'}} />
              <Input 
                placeholder="Search models..." 
                style={{paddingLeft: '36px'}}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
      </Card>

      <Card>
        <div className="table-wrapper">
            <table className="data-table">
                <thead>
                    <tr>
                        <th style={{paddingLeft: '24px'}}>Name</th>
                        <th>ID</th>
                        <th>Provider</th>
                        <th style={{paddingRight: '24px'}}>Context Window</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredModels.map(model => (
                        <tr key={model.id}>
                            <td style={{fontWeight: 600, paddingLeft: '24px'}}>{model.name}</td>
                            <td style={{fontFamily: 'monospace', color: 'var(--color-text-secondary)'}}>{model.id}</td>
                            <td>{model.providerId}</td>
                            <td style={{paddingRight: '24px'}}>{model.contextWindow > 0 ? model.contextWindow.toLocaleString() + ' tokens' : '-'}</td>
                        </tr>
                    ))}
                    {filteredModels.length === 0 && (
                        <tr>
                            <td colSpan={4} className="empty">No models found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
};
