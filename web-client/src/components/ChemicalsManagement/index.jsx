import React, { useState } from 'react';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import ChemicalFormModal from './ChemicalFormModal';
import ChemicalsTable from './ChemicalsTable';
import styles from './ChemicalsManagement.module.scss';

export default function ChemicalsManagement({ 
  chemicals, 
  loading, 
  onRefresh,
  onUpdateChemical,
  onDeleteChemical 
}) {
  const [showChemicalForm, setShowChemicalForm] = useState(false);
  const [editingChemical, setEditingChemical] = useState(null);

  const handleEdit = (chemical) => {
    setEditingChemical(chemical);
    setShowChemicalForm(true);
  };

  const handleDelete = (chemical) => {
    if (window.confirm(`Are you sure you want to delete "${chemical.name}"? This will also remove all related formulations.`)) {
      onDeleteChemical(chemical.id);
    }
  };

  const handleSubmit = (formData) => {
    if (editingChemical) {
      onUpdateChemical(editingChemical.id, formData);
      setEditingChemical(null);
    }
    setShowChemicalForm(false);
  };

  const handleClose = () => {
    setShowChemicalForm(false);
    setEditingChemical(null);
  };

  return (
    <div className={styles.chemicalsManagement}>
      <div className={styles.tabHeader}>
        <h2>Chemicals Management</h2>
        <div className={styles.headerActions}>
          <button 
            className={styles.refreshBtn}
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Chemicals Table */}
      <ChemicalsTable 
        chemicals={chemicals}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      {/* Edit Chemical Modal */}
      {showChemicalForm && (
        <ChemicalFormModal
          chemical={editingChemical}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

