import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { 
  fetchChemicals, 
  fetchChemical, 
  createChemical, 
  updateChemical, 
  deleteChemical,
  addChemicalNote,
  fetchFormulations,
  createFormulation,
  updateFormulation,
  deleteFormulation,
  addFormulationNote
} from '../services/api';
import { fetchChemicalPurchaseHistory } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import GradientText from '../components/GradientText';

const { width } = Dimensions.get('window');

export default function ChemicalsScreen({ navigation }) {
  const { user, userInfo } = useAuth();
  const [chemicals, setChemicals] = useState([]);
  const [selectedChemical, setSelectedChemical] = useState(null);
  const [formulations, setFormulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFormulationForm, setShowFormulationForm] = useState(false);
  const [editingChemical, setEditingChemical] = useState(null);
  const [editingFormulation, setEditingFormulation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    quantityMin: '',
    quantityMax: '',
    lastUpdatedFrom: '',
    lastUpdatedTo: '',
    updatedBy: '',
    thresholdAlert: false,
    amountMin: '',
    amountMax: ''
  });
  
  // Date picker states
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [dateFromPicker, setDateFromPicker] = useState(new Date());
  const [dateToPicker, setDateToPicker] = useState(new Date());
  
  // Alerts and notifications
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState({});

  useEffect(() => {
    loadChemicals();
  }, []);

  const loadChemicals = async () => {
    try {
      setLoading(true);
      const data = await fetchChemicals();
      console.log('Loaded chemicals:', data);
      setChemicals(data);
      
      // Check for alerts based on quantities
      checkForAlerts(data);
      
      // Load purchase history for account view
      if (['admin', 'account'].includes(userInfo?.role || user?.role || 'all_users')) {
        await loadPurchaseHistory(data);
      }
      
      setError('');
    } catch (err) {
      console.error('Error loading chemicals:', err);
      setError(err.message || 'Failed to load chemicals. Please check your connection.');
      setChemicals([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseHistory = async (chemicalData) => {
    const history = {};
    for (const chemical of chemicalData) {
      try {
        const historyData = await fetchChemicalPurchaseHistory(chemical.id);
        history[chemical.id] = historyData;
      } catch (err) {
        console.error(`Error loading purchase history for chemical ${chemical.id}:`, err);
        history[chemical.id] = {
          chemical_id: chemical.id,
          chemical_name: chemical.name,
          total_purchased: 0,
          total_spent: 0,
          last_purchase_date: null,
          average_unit_price: 0,
          currency: 'INR'
        };
      }
    }
    setPurchaseHistory(history);
  };

  const checkForAlerts = (chemicalData) => {
    const newAlerts = [];
    
    chemicalData.forEach(chemical => {
      const alertThreshold = chemical.alert_threshold || 10;
      
      if (chemical.quantity < alertThreshold && chemical.quantity > 0 && 
          chemical.unit !== 'pieces' && chemical.unit !== 'bottles') {
        newAlerts.push({
          id: `low_stock_${chemical.id}`,
          type: 'low_stock',
          severity: 'warning',
          message: `Low stock alert: ${chemical.name} has only ${chemical.quantity} ${chemical.unit} remaining (threshold: ${alertThreshold} ${chemical.unit})`,
          chemicalId: chemical.id,
          timestamp: new Date().toISOString()
        });
      }
      
      if (chemical.quantity <= 0) {
        newAlerts.push({
          id: `out_of_stock_${chemical.id}`,
          type: 'out_of_stock',
          severity: 'critical',
          message: `Out of stock: ${chemical.name} is completely depleted`,
          chemicalId: chemical.id,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    setAlerts(newAlerts);
  };

  const handleSelectChemical = async (id) => {
    try {
      const chemical = await fetchChemical(id);
      setSelectedChemical(chemical);
      
      // Load formulations for this chemical
      const formulationData = await fetchFormulations(id);
      setFormulations(formulationData);
      setShowDetailModal(true);
      setError('');
    } catch (err) {
      console.error('Error loading chemical details:', err);
      setError(err.message || 'Failed to load chemical details.');
    }
  };

  const handleCreateChemical = async (chemicalData) => {
    try {
      console.log('Creating chemical with data:', chemicalData);
      const result = await createChemical(chemicalData);
      console.log('Chemical created successfully:', result);
      await loadChemicals();
      setShowCreateForm(false);
      setError('');
    } catch (err) {
      console.error('Error creating chemical:', err);
      setError(err.message || 'Failed to create chemical.');
    }
  };

  const handleUpdateChemical = async (id, chemicalData) => {
    try {
      console.log('Updating chemical with data:', chemicalData);
      await updateChemical(id, chemicalData);
      console.log('Chemical updated successfully');
      await loadChemicals();
      if (selectedChemical && selectedChemical.id === id) {
        const updated = await fetchChemical(id);
        setSelectedChemical(updated);
      }
      setEditingChemical(null);
      setError('');
    } catch (err) {
      console.error('Error updating chemical:', err);
      setError(err.message || 'Failed to update chemical.');
    }
  };

  const handleDeleteChemical = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this chemical?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChemical(id);
              await loadChemicals();
              if (selectedChemical && selectedChemical.id === id) {
                setSelectedChemical(null);
                setFormulations([]);
                setShowDetailModal(false);
              }
              setError('');
            } catch (err) {
              console.error('Error deleting chemical:', err);
              setError(err.message || 'Failed to delete chemical.');
            }
          }
        }
      ]
    );
  };

  const handleAddChemicalNote = async (id, note) => {
    try {
      await addChemicalNote(id, note);
      if (selectedChemical && selectedChemical.id === id) {
        const updated = await fetchChemical(id);
        setSelectedChemical(updated);
      }
      setError('');
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err.message || 'Failed to add note.');
    }
  };

  const handleCreateFormulation = async (formulationData) => {
    try {
      const result = await createFormulation(formulationData);
      console.log('Formulation created successfully:', result);
      if (selectedChemical) {
        const formulationData = await fetchFormulations(selectedChemical.id);
        setFormulations(formulationData);
      }
      setShowFormulationForm(false);
      setError('');
    } catch (err) {
      console.error('Error creating formulation:', err);
      setError(err.message || 'Failed to create formulation.');
    }
  };

  const handleUpdateFormulation = async (id, formulationData) => {
    try {
      await updateFormulation(id, formulationData);
      if (selectedChemical) {
        const formulationData = await fetchFormulations(selectedChemical.id);
        setFormulations(formulationData);
      }
      setEditingFormulation(null);
      setError('');
    } catch (err) {
      console.error('Error updating formulation:', err);
      setError(err.message || 'Failed to update formulation.');
    }
  };

  const handleDeleteFormulation = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this formulation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFormulation(id);
              if (selectedChemical) {
                const formulationData = await fetchFormulations(selectedChemical.id);
                setFormulations(formulationData);
              }
              setError('');
            } catch (err) {
              console.error('Error deleting formulation:', err);
              setError(err.message || 'Failed to delete formulation.');
            }
          }
        }
      ]
    );
  };

  const handleAddFormulationNote = async (id, note) => {
    try {
      await addFormulationNote(id, note);
      if (selectedChemical) {
        const formulationData = await fetchFormulations(selectedChemical.id);
        setFormulations(formulationData);
      }
      setError('');
    } catch (err) {
      console.error('Error adding formulation note:', err);
      setError(err.message || 'Failed to add formulation note.');
    }
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleDateFromChange = (event, selectedDate) => {
    setShowDateFromPicker(false);
    if (selectedDate) {
      setDateFromPicker(selectedDate);
      setFilters(prev => ({ 
        ...prev, 
        lastUpdatedFrom: selectedDate.toISOString().split('T')[0] 
      }));
    }
  };

  const handleDateToChange = (event, selectedDate) => {
    setShowDateToPicker(false);
    if (selectedDate) {
      setDateToPicker(selectedDate);
      setFilters(prev => ({ 
        ...prev, 
        lastUpdatedTo: selectedDate.toISOString().split('T')[0] 
      }));
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  // Filter chemicals based on search term and filters
  const getFilteredChemicals = () => {
    let filtered = [...chemicals];

    // Search by chemical name
    if (searchTerm.trim()) {
      filtered = filtered.filter(chemical =>
        chemical.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by quantity range
    if (filters.quantityMin !== '') {
      filtered = filtered.filter(chemical => chemical.quantity >= parseFloat(filters.quantityMin));
    }
    if (filters.quantityMax !== '') {
      filtered = filtered.filter(chemical => chemical.quantity <= parseFloat(filters.quantityMax));
    }

    // Filter by last updated date range
    if (filters.lastUpdatedFrom) {
      const fromDate = new Date(filters.lastUpdatedFrom);
      filtered = filtered.filter(chemical => new Date(chemical.last_updated) >= fromDate);
    }
    if (filters.lastUpdatedTo) {
      const toDate = new Date(filters.lastUpdatedTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(chemical => new Date(chemical.last_updated) <= toDate);
    }

    // Filter by updated by user
    if (filters.updatedBy.trim()) {
      filtered = filtered.filter(chemical => {
        if (chemical.updated_by_user) {
          const fullName = `${chemical.updated_by_user.first_name} ${chemical.updated_by_user.last_name || ''}`.toLowerCase();
          return fullName.includes(filters.updatedBy.toLowerCase());
        }
        return chemical.updated_by && chemical.updated_by.toLowerCase().includes(filters.updatedBy.toLowerCase());
      });
    }

    // Filter by threshold alert (show only chemicals below threshold)
    if (filters.thresholdAlert) {
      filtered = filtered.filter(chemical => {
        const threshold = chemical.alert_threshold || 10;
        return chemical.quantity < threshold;
      });
    }

    return filtered;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChemicals();
    setRefreshing(false);
  };

  // Role-based permissions
  const userRole = userInfo?.role || user?.role || 'all_users';
  const canCreateChemical = ['admin', 'lab_staff', 'product'].includes(userRole);
  const canEditChemical = ['admin', 'lab_staff', 'product', 'account'].includes(userRole);
  const canDeleteChemical = userRole === 'admin';
  const canCreateFormulation = ['admin', 'lab_staff', 'product'].includes(userRole);
  const canEditFormulation = ['admin', 'lab_staff', 'product', 'account'].includes(userRole);
  const canDeleteFormulation = userRole === 'admin';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chemical inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/company_icon.png')} 
            style={styles.companyLogo}
            resizeMode="contain"
          />
          <GradientText style={styles.companyName}>Blossoms Aroma</GradientText>
        </View>
        <Text style={styles.headerTitle}>Chemical Inventory Management</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>
            Role: {userRole} | Chemicals: {chemicals.length}
          </Text>
          {alerts.length > 0 && (
            <TouchableOpacity 
              style={[
                styles.alertButton,
                { backgroundColor: alerts.some(a => a.severity === 'critical') ? '#dc3545' : '#ffc107' }
              ]}
              onPress={() => setShowAlerts(!showAlerts)}
            >
              <Ionicons name="warning" size={16} color="white" />
              <Text style={styles.alertButtonText}>Alerts ({alerts.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Alerts Section */}
      {showAlerts && alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.alertsTitle}>Active Alerts</Text>
          <ScrollView style={styles.alertsList}>
            {alerts.map(alert => (
              <View 
                key={alert.id} 
                style={[
                  styles.alertItem,
                  alert.severity === 'critical' ? styles.criticalAlert : styles.warningAlert
                ]}
              >
                <View style={styles.alertContent}>
                  <Ionicons 
                    name={alert.severity === 'critical' ? 'close-circle' : 'warning'} 
                    size={16} 
                    color={alert.severity === 'critical' ? 'red' : 'orange'} 
                  />
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.timestamp).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => dismissAlert(alert.id)}
                  style={styles.dismissAlert}
                >
                  <Ionicons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search and Filter Section */}
      <View style={styles.searchFilterSection}>
        <View style={styles.searchBar}>
          <View style={styles.searchInput}>
            <Ionicons name="search" size={16} style={styles.searchIcon} />
            <TextInput
              style={styles.searchField}
              placeholder="Search chemicals by name..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm ? (
              <TouchableOpacity
                onPress={() => setSearchTerm('')}
                style={styles.clearSearch}
              >
                <Ionicons name="close" size={14} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterToggle, showFilters && styles.activeFilter]}
          >
            <Ionicons name="filter" size={16} color="#007AFF" />
            <Text style={styles.filterToggleText}>Filters</Text>
            {Object.values(filters).some(value => value !== '' && value !== false) && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterPanel}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Quantity Range</Text>
              <View style={styles.rangeInputs}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Min"
                  value={filters.quantityMin}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, quantityMin: text }))}
                  keyboardType="numeric"
                />
                <Text style={styles.rangeSeparator}>-</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Max"
                  value={filters.quantityMax}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, quantityMax: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Last Updated Range</Text>
              <View style={styles.dateInputs}>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDateFromPicker(true)}
                >
                  <Text style={filters.lastUpdatedFrom ? styles.dateText : styles.datePlaceholder}>
                    {filters.lastUpdatedFrom ? formatDateForDisplay(filters.lastUpdatedFrom) : 'From Date'}
                  </Text>
                  <Ionicons name="calendar" size={16} color="#666" />
                </TouchableOpacity>
                <Text style={styles.rangeSeparator}>to</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDateToPicker(true)}
                >
                  <Text style={filters.lastUpdatedTo ? styles.dateText : styles.datePlaceholder}>
                    {filters.lastUpdatedTo ? formatDateForDisplay(filters.lastUpdatedTo) : 'To Date'}
                  </Text>
                  <Ionicons name="calendar" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Updated By</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Search by user name..."
                value={filters.updatedBy}
                onChangeText={(text) => setFilters(prev => ({ ...prev, updatedBy: text }))}
              />
            </View>

            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFilters(prev => ({ ...prev, thresholdAlert: !prev.thresholdAlert }))}
              >
                <View style={[styles.checkbox, filters.thresholdAlert && styles.checkboxChecked]}>
                  {filters.thresholdAlert && <Ionicons name="checkmark" size={12} color="white" />}
                </View>
                <Text style={styles.checkboxLabel}>Show only chemicals below alert threshold</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.clearFilters}
              onPress={() => setFilters({
                quantityMin: '',
                quantityMax: '',
                lastUpdatedFrom: '',
                lastUpdatedTo: '',
                updatedBy: '',
                thresholdAlert: false,
                amountMin: '',
                amountMax: ''
              })}
            >
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Chemicals List */}
      <View style={styles.content}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            Chemicals ({getFilteredChemicals().length} of {chemicals.length})
          </Text>
          {canCreateChemical && (
            <TouchableOpacity 
              onPress={() => setShowCreateForm(true)} 
              style={styles.addButton}
            >
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.addButtonText}>Add Chemical</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {chemicals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flask" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No Chemicals Found</Text>
            <Text style={styles.emptySubtitle}>Get started by adding your first chemical to the inventory.</Text>
            {canCreateChemical && (
              <TouchableOpacity 
                onPress={() => setShowCreateForm(true)} 
                style={styles.addFirstButton}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text style={styles.addFirstButtonText}>Add Your First Chemical</Text>
              </TouchableOpacity>
            )}
            {!canCreateChemical && (
              <Text style={styles.noPermissionText}>
                You don't have permission to add chemicals. Contact an administrator.
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={getFilteredChemicals()}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item: chemical }) => {
              const chemicalAlerts = alerts.filter(a => a.chemicalId === chemical.id);
              const hasCriticalAlert = chemicalAlerts.some(a => a.severity === 'critical');
              const hasWarningAlert = chemicalAlerts.some(a => a.severity === 'warning');
              
              return (
                <TouchableOpacity
                  key={chemical.id}
                  style={[
                    styles.chemicalCard,
                    selectedChemical?.id === chemical.id && styles.selectedCard,
                    hasCriticalAlert && styles.criticalAlertCard,
                    hasWarningAlert && !hasCriticalAlert && styles.warningAlertCard
                  ]}
                  onPress={() => handleSelectChemical(chemical.id)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{chemical.name}</Text>
                    {hasCriticalAlert && <Ionicons name="close-circle" size={16} color="red" />}
                    {hasWarningAlert && !hasCriticalAlert && <Ionicons name="warning" size={16} color="orange" />}
                  </View>
                  
                  <View style={styles.cardContent}>
                    <View style={styles.quantityInfo}>
                      <Text style={styles.quantityLabel}>Current Stock:</Text>
                      <Text style={[
                        styles.quantityValue,
                        chemical.quantity <= 0 ? styles.outOfStock : 
                        chemical.quantity < (chemical.alert_threshold || 10) ? styles.lowStock : styles.normalStock
                      ]}>
                        {chemical.quantity} {chemical.unit}
                      </Text>
                    </View>
                    
                    <View style={styles.stockStatus}>
                      {chemical.quantity <= 0 && <Text style={styles.statusOut}>Out of Stock</Text>}
                      {chemical.quantity > 0 && chemical.quantity < (chemical.alert_threshold || 10) && <Text style={styles.statusLow}>Low Stock</Text>}
                      {chemical.quantity >= (chemical.alert_threshold || 10) && <Text style={styles.statusNormal}>In Stock</Text>}
                    </View>
                    
                    <View style={styles.additionalInfo}>
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>Alert Threshold:</Text> {chemical.alert_threshold ? `${chemical.alert_threshold} ${chemical.unit}` : 'Not set'}
                      </Text>
                      {chemical.location && (
                        <Text style={styles.infoText}>
                          <Text style={styles.infoLabel}>Location:</Text> {chemical.location}
                        </Text>
                      )}
                      {chemical.supplier && (
                        <Text style={styles.infoText}>
                          <Text style={styles.infoLabel}>Supplier:</Text> {chemical.supplier}
                        </Text>
                      )}
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>Last Updated:</Text> {new Date(chemical.last_updated).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardActions}>
                    {canEditChemical && (
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          setEditingChemical(chemical);
                        }}
                        style={styles.editButton}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    {canDeleteChemical && (
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteChemical(chemical.id);
                        }}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Chemical Detail Modal */}
      {selectedChemical && (
        <ChemicalDetailModal
          visible={showDetailModal}
          chemical={selectedChemical}
          formulations={formulations}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedChemical(null);
            setFormulations([]);
          }}
          onEdit={() => {
            setEditingChemical(selectedChemical);
            setShowDetailModal(false);
          }}
          onDelete={() => {
            handleDeleteChemical(selectedChemical.id);
            setShowDetailModal(false);
          }}
          onCreateFormulation={() => {
            setShowFormulationForm(true);
            setShowDetailModal(false);
          }}
          onEditFormulation={setEditingFormulation}
          onDeleteFormulation={handleDeleteFormulation}
          onAddNote={handleAddChemicalNote}
          onAddFormulationNote={handleAddFormulationNote}
          canEdit={canEditChemical}
          canDelete={canDeleteChemical}
          canCreateFormulation={canCreateFormulation}
          canEditFormulation={canEditFormulation}
          canDeleteFormulation={canDeleteFormulation}
        />
      )}

      {/* Chemical Form Modal */}
      {(showCreateForm || editingChemical) && (
        <ChemicalFormModal
          visible={showCreateForm || !!editingChemical}
          chemical={editingChemical}
          onSubmit={editingChemical ? 
            (data) => handleUpdateChemical(editingChemical.id, data) : 
            handleCreateChemical
          }
          onCancel={() => {
            setShowCreateForm(false);
            setEditingChemical(null);
          }}
          title={editingChemical ? 'Edit Chemical' : 'Add New Chemical'}
        />
      )}

      {/* Formulation Form Modal */}
      {(showFormulationForm || editingFormulation) && (
        <FormulationFormModal
          visible={showFormulationForm || !!editingFormulation}
          formulation={editingFormulation}
          chemicalId={selectedChemical?.id}
          onSubmit={editingFormulation ? 
            (data) => handleUpdateFormulation(editingFormulation.id, data) : 
            handleCreateFormulation
          }
          onCancel={() => {
            setShowFormulationForm(false);
            setEditingFormulation(null);
          }}
          title={editingFormulation ? 'Edit Formulation' : 'Add Formulation Detail'}
        />
      )}

      {/* Date Pickers */}
      {showDateFromPicker && (
        <DateTimePicker
          value={dateFromPicker}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateFromChange}
        />
      )}
      
      {showDateToPicker && (
        <DateTimePicker
          value={dateToPicker}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateToChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 50, // Add extra padding to avoid status bar
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  alertButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  errorText: {
    color: '#dc3545',
    padding: 16,
    textAlign: 'center',
    backgroundColor: '#f8d7da',
    margin: 16,
    borderRadius: 8,
  },
  alertsSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    padding: 16,
  },
  alertsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  alertsList: {
    maxHeight: 200,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
  },
  criticalAlert: {
    backgroundColor: '#f8d7da',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  warningAlert: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  alertContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertMessage: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  dismissAlert: {
    padding: 4,
  },
  searchFilterSection: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    color: '#666',
    marginRight: 8,
  },
  searchField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearSearch: {
    padding: 4,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  activeFilter: {
    backgroundColor: '#e3f2fd',
  },
  filterToggleText: {
    marginLeft: 4,
    color: '#007AFF',
    fontSize: 14,
  },
  filterBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginLeft: 4,
  },
  filterPanel: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  rangeSeparator: {
    marginHorizontal: 8,
    color: '#666',
  },
  dateInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  datePlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  clearFilters: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  addFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  noPermissionText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
  },
  chemicalCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  criticalAlertCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  warningAlertCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  cardContent: {
    marginBottom: 12,
  },
  quantityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  normalStock: {
    color: '#28a745',
  },
  lowStock: {
    color: '#ffc107',
  },
  outOfStock: {
    color: '#dc3545',
  },
  stockStatus: {
    marginBottom: 8,
  },
  statusOut: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '500',
  },
  statusLow: {
    color: '#ffc107',
    fontSize: 12,
    fontWeight: '500',
  },
  statusNormal: {
    color: '#28a745',
    fontSize: 12,
    fontWeight: '500',
  },
  additionalInfo: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoLabel: {
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  companyLogo: {
    width: 35,
    height: 35,
    marginRight: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513', // Saddle Brown - more brown color
  },
});

// Chemical Detail Modal Component
function ChemicalDetailModal({
  visible,
  chemical,
  formulations,
  onClose,
  onEdit,
  onDelete,
  onCreateFormulation,
  onEditFormulation,
  onDeleteFormulation,
  onAddNote,
  onAddFormulationNote,
  canEdit,
  canDelete,
  canCreateFormulation,
  canEditFormulation,
  canDeleteFormulation
}) {
  const [note, setNote] = useState('');

  const handleAddNote = () => {
    if (note.trim()) {
      onAddNote(chemical.id, note);
      setNote('');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={detailModalStyles.container}>
        <View style={detailModalStyles.header}>
          <Text style={detailModalStyles.title}>{chemical.name}</Text>
          <TouchableOpacity onPress={onClose} style={detailModalStyles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={detailModalStyles.content}>
          <View style={detailModalStyles.section}>
            <Text style={detailModalStyles.sectionTitle}>Chemical Details</Text>
            <View style={detailModalStyles.detailRow}>
              <Text style={detailModalStyles.label}>Quantity:</Text>
              <Text style={detailModalStyles.value}>{chemical.quantity} {chemical.unit}</Text>
            </View>
            <View style={detailModalStyles.detailRow}>
              <Text style={detailModalStyles.label}>Alert Threshold:</Text>
              <Text style={detailModalStyles.value}>
                {chemical.alert_threshold ? `${chemical.alert_threshold} ${chemical.unit}` : 'Not set'}
              </Text>
            </View>
            {chemical.location && (
              <View style={detailModalStyles.detailRow}>
                <Text style={detailModalStyles.label}>Location:</Text>
                <Text style={detailModalStyles.value}>{chemical.location}</Text>
              </View>
            )}
            {chemical.supplier && (
              <View style={detailModalStyles.detailRow}>
                <Text style={detailModalStyles.label}>Supplier:</Text>
                <Text style={detailModalStyles.value}>{chemical.supplier}</Text>
              </View>
            )}
            <View style={detailModalStyles.detailRow}>
              <Text style={detailModalStyles.label}>Last Updated:</Text>
              <Text style={detailModalStyles.value}>
                {new Date(chemical.last_updated).toLocaleDateString()}
              </Text>
            </View>
            {chemical.updated_by_user && (
              <View style={detailModalStyles.detailRow}>
                <Text style={detailModalStyles.label}>Updated by:</Text>
                <Text style={detailModalStyles.value}>
                  {chemical.updated_by_user.first_name} {chemical.updated_by_user.last_name || ''} ({chemical.updated_by_user.role.replace('_', ' ').toUpperCase()})
                </Text>
              </View>
            )}
          </View>

          {chemical.formulation && (
            <View style={detailModalStyles.section}>
              <Text style={detailModalStyles.sectionTitle}>Formulation</Text>
              <Text style={detailModalStyles.formulationText}>{chemical.formulation}</Text>
            </View>
          )}

          {chemical.notes && (
            <View style={detailModalStyles.section}>
              <Text style={detailModalStyles.sectionTitle}>Notes</Text>
              <Text style={detailModalStyles.notesText}>{chemical.notes}</Text>
            </View>
          )}

          <View style={detailModalStyles.section}>
            <View style={detailModalStyles.sectionHeader}>
              <Text style={detailModalStyles.sectionTitle}>Formulation Details</Text>
              {canCreateFormulation && (
                <TouchableOpacity onPress={onCreateFormulation} style={detailModalStyles.addButton}>
                  <Ionicons name="add" size={16} color="#007AFF" />
                  <Text style={detailModalStyles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            {formulations.length === 0 ? (
              <Text style={detailModalStyles.emptyText}>No formulation details available</Text>
            ) : (
              formulations.map(formulation => (
                <View key={formulation.id} style={detailModalStyles.formulationItem}>
                  <Text style={detailModalStyles.formulationTitle}>{formulation.name}</Text>
                  <Text style={detailModalStyles.formulationDescription}>{formulation.description}</Text>
                  {formulation.notes && (
                    <Text style={detailModalStyles.formulationNotes}>{formulation.notes}</Text>
                  )}
                  <View style={detailModalStyles.formulationActions}>
                    {canEditFormulation && (
                      <TouchableOpacity 
                        onPress={() => onEditFormulation(formulation)}
                        style={detailModalStyles.actionButton}
                      >
                        <Text style={detailModalStyles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    {canDeleteFormulation && (
                      <TouchableOpacity 
                        onPress={() => onDeleteFormulation(formulation.id)}
                        style={[detailModalStyles.actionButton, detailModalStyles.deleteAction]}
                      >
                        <Text style={detailModalStyles.deleteActionText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={detailModalStyles.section}>
            <Text style={detailModalStyles.sectionTitle}>Add Note</Text>
            <TextInput
              style={detailModalStyles.noteInput}
              placeholder="Enter a note..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity onPress={handleAddNote} style={detailModalStyles.addNoteButton}>
              <Text style={detailModalStyles.addNoteButtonText}>Add Note</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={detailModalStyles.footer}>
          {canEdit && (
            <TouchableOpacity onPress={onEdit} style={detailModalStyles.footerButton}>
              <Text style={detailModalStyles.footerButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity onPress={onDelete} style={[detailModalStyles.footerButton, detailModalStyles.deleteFooterButton]}>
              <Text style={detailModalStyles.deleteFooterButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const detailModalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  formulationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  formulationItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  formulationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  formulationDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  formulationNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  formulationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteAction: {
    backgroundColor: '#dc3545',
  },
  deleteActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  addNoteButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  addNoteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  footerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteFooterButton: {
    backgroundColor: '#dc3545',
  },
  deleteFooterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

// Chemical Form Modal Component
function ChemicalFormModal({ visible, chemical, onSubmit, onCancel, title }) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: 0,
    unit: '',
    formulation: '',
    notes: '',
    alert_threshold: '',
    supplier: '',
    location: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (chemical) {
      setFormData({
        name: chemical.name || '',
        quantity: chemical.quantity || 0,
        unit: chemical.unit || '',
        formulation: chemical.formulation || '',
        notes: chemical.notes || '',
        alert_threshold: chemical.alert_threshold || '',
        supplier: chemical.supplier || '',
        location: chemical.location || ''
      });
    } else {
      setFormData({
        name: '',
        quantity: 0,
        unit: '',
        formulation: '',
        notes: '',
        alert_threshold: '',
        supplier: '',
        location: ''
      });
    }
    setErrors({});
  }, [chemical, visible]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Chemical name is required';
    }
    
    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity must be non-negative';
    }
    
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }
    
    if (formData.alert_threshold !== '' && formData.alert_threshold < 0) {
      newErrors.alert_threshold = 'Alert threshold must be non-negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const submitData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        alert_threshold: formData.alert_threshold === '' ? null : parseFloat(formData.alert_threshold)
      };
      console.log('Submitting chemical data:', submitData);
      onSubmit(submitData);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={formModalStyles.container}>
        <View style={formModalStyles.header}>
          <Text style={formModalStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onCancel} style={formModalStyles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={formModalStyles.content}>
          <View style={formModalStyles.section}>
            <Text style={formModalStyles.sectionTitle}>Basic Info</Text>
            <View style={formModalStyles.formGroup}>
              <Text style={formModalStyles.label}>Chemical Name *</Text>
              <TextInput
                style={[formModalStyles.input, errors.name && formModalStyles.inputError]}
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="Enter chemical name"
              />
              {errors.name && <Text style={formModalStyles.errorText}>{errors.name}</Text>}
            </View>
          </View>

          <View style={formModalStyles.section}>
            <Text style={formModalStyles.sectionTitle}>Stock & Alerts</Text>
            <View style={formModalStyles.formRow}>
              <View style={[formModalStyles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={formModalStyles.label}>Quantity *</Text>
                <TextInput
                  style={[formModalStyles.input, errors.quantity && formModalStyles.inputError]}
                  value={formData.quantity.toString()}
                  onChangeText={(text) => handleChange('quantity', text)}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
                {errors.quantity && <Text style={formModalStyles.errorText}>{errors.quantity}</Text>}
              </View>

              <View style={[formModalStyles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={formModalStyles.label}>Unit *</Text>
                <View style={[formModalStyles.pickerContainer, errors.unit && formModalStyles.inputError]}>
                  <Picker
                    selectedValue={formData.unit}
                    onValueChange={(value) => handleChange('unit', value)}
                    style={formModalStyles.picker}
                  >
                    <Picker.Item label="Select unit" value="" />
                    <Picker.Item label="Grams (g)" value="g" />
                    <Picker.Item label="Kilograms (kg)" value="kg" />
                    <Picker.Item label="Milligrams (mg)" value="mg" />
                    <Picker.Item label="Liters (L)" value="L" />
                    <Picker.Item label="Milliliters (mL)" value="mL" />
                    <Picker.Item label="Moles (mol)" value="mol" />
                    <Picker.Item label="Millimoles (mmol)" value="mmol" />
                    <Picker.Item label="Pieces" value="pieces" />
                    <Picker.Item label="Bottles" value="bottles" />
                    <Picker.Item label="Vials" value="vials" />
                    <Picker.Item label="Other" value="other" />
                  </Picker>
                </View>
                {errors.unit && <Text style={formModalStyles.errorText}>{errors.unit}</Text>}
              </View>
            </View>

            <View style={formModalStyles.formRow}>
              <View style={[formModalStyles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={formModalStyles.label}>Alert Threshold</Text>
                <TextInput
                  style={[formModalStyles.input, errors.alert_threshold && formModalStyles.inputError]}
                  value={formData.alert_threshold.toString()}
                  onChangeText={(text) => handleChange('alert_threshold', text)}
                  placeholder="Enter threshold value"
                  keyboardType="numeric"
                />
                <Text style={formModalStyles.helpText}>Quantity at which low stock alerts are triggered (leave empty for no alerts)</Text>
                {errors.alert_threshold && <Text style={formModalStyles.errorText}>{errors.alert_threshold}</Text>}
              </View>

              <View style={[formModalStyles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={formModalStyles.label}>Storage Location</Text>
                <TextInput
                  style={formModalStyles.input}
                  value={formData.location}
                  onChangeText={(text) => handleChange('location', text)}
                  placeholder="e.g., Lab A, Shelf 3"
                />
              </View>
            </View>
          </View>

          <View style={formModalStyles.section}>
            <Text style={formModalStyles.sectionTitle}>Supplier Info</Text>
            <View style={formModalStyles.formGroup}>
              <Text style={formModalStyles.label}>Supplier</Text>
              <TextInput
                style={formModalStyles.input}
                value={formData.supplier}
                onChangeText={(text) => handleChange('supplier', text)}
                placeholder="Enter supplier name"
              />
            </View>
          </View>

          <View style={formModalStyles.section}>
            <Text style={formModalStyles.sectionTitle}>Formulation & Notes</Text>
            <View style={formModalStyles.formGroup}>
              <Text style={formModalStyles.label}>Formulation</Text>
              <TextInput
                style={[formModalStyles.textarea, { height: 100 }]}
                value={formData.formulation}
                onChangeText={(text) => handleChange('formulation', text)}
                placeholder="Enter formulation details..."
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={formModalStyles.formGroup}>
              <Text style={formModalStyles.label}>Notes</Text>
              <TextInput
                style={[formModalStyles.textarea, { height: 80 }]}
                value={formData.notes}
                onChangeText={(text) => handleChange('notes', text)}
                placeholder="Enter any additional notes..."
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={formModalStyles.footer}>
          <TouchableOpacity onPress={onCancel} style={formModalStyles.cancelButton}>
            <Text style={formModalStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit} style={formModalStyles.submitButton}>
            <Text style={formModalStyles.submitButtonText}>
              {chemical ? 'Update Chemical' : 'Create Chemical'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const formModalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

// Formulation Form Modal Component
function FormulationFormModal({ visible, formulation, chemicalId, onSubmit, onCancel, title }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (formulation) {
      setFormData({
        name: formulation.name || '',
        description: formulation.description || '',
        notes: formulation.notes || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        notes: ''
      });
    }
    setErrors({});
  }, [formulation, visible]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Formulation name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const submitData = {
        ...formData,
        chemical_id: chemicalId
      };
      onSubmit(submitData);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={formModalStyles.container}>
        <View style={formModalStyles.header}>
          <Text style={formModalStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onCancel} style={formModalStyles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={formModalStyles.content}>
          <View style={formModalStyles.section}>
            <View style={formModalStyles.formGroup}>
              <Text style={formModalStyles.label}>Formulation Name *</Text>
              <TextInput
                style={[formModalStyles.input, errors.name && formModalStyles.inputError]}
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="Enter formulation name"
              />
              {errors.name && <Text style={formModalStyles.errorText}>{errors.name}</Text>}
            </View>

            <View style={formModalStyles.formGroup}>
              <Text style={formModalStyles.label}>Description *</Text>
              <TextInput
                style={[formModalStyles.textarea, { height: 100 }, errors.description && formModalStyles.inputError]}
                value={formData.description}
                onChangeText={(text) => handleChange('description', text)}
                placeholder="Enter formulation description..."
                multiline
                textAlignVertical="top"
              />
              {errors.description && <Text style={formModalStyles.errorText}>{errors.description}</Text>}
            </View>

            <View style={formModalStyles.formGroup}>
              <Text style={formModalStyles.label}>Notes</Text>
              <TextInput
                style={[formModalStyles.textarea, { height: 80 }]}
                value={formData.notes}
                onChangeText={(text) => handleChange('notes', text)}
                placeholder="Enter any additional notes..."
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={formModalStyles.footer}>
          <TouchableOpacity onPress={onCancel} style={formModalStyles.cancelButton}>
            <Text style={formModalStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit} style={formModalStyles.submitButton}>
            <Text style={formModalStyles.submitButtonText}>
              {formulation ? 'Update Formulation' : 'Create Formulation'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
} 