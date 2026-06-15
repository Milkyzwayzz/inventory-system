import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import {
  FileUp, Printer, Clock, Loader2, 
  Trash2, Edit3, CheckCircle, AlertCircle, 
  Layers, ChevronRight, FileText, X, Info, Eye, Download,
  FileCode, CreditCard, Truck, DollarSign
} from 'lucide-react';
import { Button, Badge, Input } from '../../components/ui';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import {
  collection, addDoc, serverTimestamp,
  doc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { calculatePrice } from '../../utils/calculatePrice';

const PrintingPage = () => {
  // State management
  const { data: jobs = [] } = useFirestore('printJobs');
  const [form, setForm] = useState({
    customerName: '',
    pages: 1,
    paperSize: 'A4',
    color: 'BW',
    binding: 'None',
    serviceType: 'Print',
    priority: 'normal'
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [deliveryModal, setDeliveryModal] = useState(null);
  const fileInputRef = useRef(null);

  // Memoized calculations
  const price = useMemo(() => calculatePrice(form), [form]);

  // File utilities
  const isWordDoc = useCallback((type, name) => {
    return type?.includes('officedocument.wordprocessingml.document') || 
           type?.includes('msword') || 
           name?.toLowerCase().endsWith('.docx') || 
           name?.toLowerCase().endsWith('.doc');
  }, []);

  // Form handlers
  const updateFormField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      customerName: '',
      pages: 1,
      paperSize: 'A4',
      color: 'BW',
      binding: 'None',
      serviceType: 'Print',
      priority: 'normal'
    });
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setEditingJob(null);
  }, []);

  const handleEdit = useCallback((job) => {
    setEditingJob(job);
    
    // Normalize color (bw -> BW, color -> Color)
    const normalizedColor = job.color?.toLowerCase() === 'color' ? 'Color' : 'BW';
    
    // Normalize binding options to match Title Case select options
    let normalizedBinding = 'None';
    if (job.binding) {
      const b = job.binding.toLowerCase();
      if (b === 'spiral') normalizedBinding = 'Spiral';
      else if (b === 'hardcover') normalizedBinding = 'Hardcover';
      else if (b === 'softcover') normalizedBinding = 'Softcover';
      else if (b === 'staple') normalizedBinding = 'Staple';
      else if (b === 'glue') normalizedBinding = 'Glue';
    }

    // Normalize serviceType (handle custom customer catalogue items)
    const normalizedServiceType = job.serviceType || job.catalogueItem || 'Print';

    setForm({
      customerName: job.customerName || '',
      pages: job.pages || 1,
      paperSize: job.paperSize || 'A4',
      color: normalizedColor,
      binding: normalizedBinding,
      serviceType: normalizedServiceType,
      priority: job.priority || 'normal'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const submitJob = async () => {
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(editingJob ? 'Updating job...' : 'Creating job...');

    try {
      const payload = {
        ...form,
        pages: parseInt(form.pages),
        price: parseFloat(price),
        serviceType: form.serviceType,
        updatedAt: serverTimestamp()
      };

      if (editingJob) {
        const newPrice = parseFloat(price);
        const newTotalPrice = newPrice + (editingJob.deliveryCharge || 0);
        await updateDoc(doc(db, 'printJobs', editingJob.id), {
          ...payload,
          totalPrice: newTotalPrice
        });
        toast.success('Job updated successfully', { id: toastId });
        resetForm();
      } else {
        if (!file) {
          toast.error('Please select a file first', { id: toastId });
          setLoading(false);
          return;
        }

        if (file.size > 800000) {
          toast.error('File too large (Max 800KB for preview). Proceeding without preview.', { id: toastId });
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            await addDoc(collection(db, 'printJobs'), {
              ...payload,
              customerId: null,
              customerEmail: null,
              readByCustomer: false,
              fileName: file.name,
              fileType: file.type || 'application/octet-stream', 
              filePreview: file.size < 800000 ? reader.result : null,
              status: 'pending',
              paymentStatus: 'unpaid',
              deliveryOption: null,
              deliveryCharge: 0,
              totalPrice: parseFloat(price),
              createdAt: serverTimestamp()
            });
            toast.success('Job added to queue', { id: toastId });
            resetForm();
          } catch (err) {
            console.error(err);
            toast.error('Storage error: File might be too large.', { id: toastId });
          } finally {
            setLoading(false);
          }
        };
        reader.onerror = () => {
          toast.error('Failed to read file', { id: toastId });
          setLoading(false);
        };
      }
    } catch (error) {
      console.error(error);
      toast.error('Operation failed', { id: toastId });
      setLoading(false);
    }
  };

  const notifyCustomer = async (job, status) => {
    if (!job?.customerId) return;
    const statusMessages = {
      processing: 'is now processing.',
      ready: 'is ready for pickup.',
      completed: 'has been completed.',
    };

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: job.customerId,
        jobId: job.id,
        type: 'job_status',
        message: `Your ${job.serviceType || 'print'} order ${statusMessages[status] || `is now ${status}.`}`,
        status,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Customer notify failed', error);
    }
  };

  const updateStatus = async (job, status) => {
    try {
      const updatePayload = {
        status,
        updatedAt: serverTimestamp()
      };

      if (['processing', 'ready', 'completed'].includes(status)) {
        updatePayload.readByCustomer = false;
      }

      await updateDoc(doc(db, 'printJobs', job.id), updatePayload);

      if (['processing', 'ready', 'completed'].includes(status)) {
        await notifyCustomer(job, status);
      }
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const deleteJob = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await deleteDoc(doc(db, 'printJobs', id));
      toast.success('Job deleted');
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const handlePayment = async (job, paymentData) => {
    try {
      await updateDoc(doc(db, 'printJobs', job.id), {
        paymentStatus: 'paid',
        paymentMethod: paymentData.method,
        paymentDate: serverTimestamp(),
        status: 'processing',
        updatedAt: serverTimestamp()
      });
      toast.success('Payment processed successfully!');
      setPaymentModal(null);
    } catch (error) {
      toast.error('Payment failed');
    }
  };

  const handleDelivery = async (job, deliveryData) => {
    try {
      await updateDoc(doc(db, 'printJobs', job.id), {
        deliveryOption: deliveryData.option,
        deliveryCharge: deliveryData.charge,
        deliveryAddress: deliveryData.address || null,
        location: deliveryData.location || null,
        totalPrice: deliveryData.totalPrice,
        updatedAt: serverTimestamp()
      });
      toast.success('Delivery option updated!');
      setDeliveryModal(null);
    } catch (error) {
      toast.error('Failed to update delivery');
    }
  };

  // Components
  const FileUploadArea = () => (
    <div 
      className={`group relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 cursor-pointer ${
        file ? 'border-indigo-500 bg-indigo-50/50' : 'border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50/20'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        ref={fileInputRef} 
        type="file" 
        className="hidden" 
        accept=".pdf,.doc,.docx,image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${
        file ? 'bg-indigo-600 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400 group-hover:scale-110'
      }`}>
        <FileUp size={28} />
      </div>
      <p className="text-sm font-black truncate max-w-xs mx-auto text-zinc-900 dark:text-white">
        {file ? file.name : 'Upload Document'}
      </p>
      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-2 italic opacity-60">
        PDF, DOCX, JPG
      </p>
    </div>
  );

  const FilePreviewModal = () => (
    selectedPreview && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-10">
        <div 
          className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl" 
          onClick={() => setSelectedPreview(null)} 
        />
        <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
          {/* Modal Header */}
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${
                isWordDoc(selectedPreview.fileType, selectedPreview.fileName) 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'bg-indigo-50 text-indigo-600'
              }`}>
                {isWordDoc(selectedPreview.fileType, selectedPreview.fileName) 
                  ? <FileCode size={24} /> 
                  : <FileText size={24} />
                }
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-tight truncate max-w-md">
                  {selectedPreview.fileName}
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  {selectedPreview.customerName} • {selectedPreview.pages} {selectedPreview.pages === 1 ? 'copy' : 'copies'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedPreview(null)}
              className="w-12 h-12 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-all active:scale-90"
            >
              <X size={24} className="text-zinc-900" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4 md:p-8 overflow-auto">
            {!selectedPreview.filePreview ? (
              <div className="text-center space-y-4">
                <AlertCircle size={64} className="mx-auto text-zinc-300" />
                <p className="text-zinc-500 font-bold">Preview data was not stored (file too large).</p>
              </div>
            ) : selectedPreview.fileType?.includes('pdf') ? (
              <embed 
                src={selectedPreview.filePreview} 
                type="application/pdf" 
                className="w-full h-full rounded-xl shadow-2xl" 
              />
            ) : isWordDoc(selectedPreview.fileType, selectedPreview.fileName) ? (
              <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-12 rounded-[3rem] shadow-2xl text-center space-y-6 animate-in slide-in-from-bottom-4">
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                  <FileCode size={48} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black">Word Document</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Browsers cannot preview Microsoft Word files directly. Please download the file to view its content.
                  </p>
                </div>
                <a 
                  href={selectedPreview.filePreview} 
                  download={selectedPreview.fileName}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                >
                  <Download size={18} /> Download to Open
                </a>
              </div>
            ) : (
              <img 
                src={selectedPreview.filePreview} 
                alt="Document" 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-xl"
              />
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSelectedPreview(null)}>
              Dismiss Viewer
            </Button>
            {selectedPreview.filePreview && (
              <a 
                href={selectedPreview.filePreview} 
                download={selectedPreview.fileName}
                className="bg-indigo-600 text-white px-6 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg"
              >
                <Download size={16} /> Get File
              </a>
            )}
          </div>
        </div>
      </div>
    )
  );

  // Payment Modal
  const PaymentModalComponent = ({ job, onClose, onSuccess }) => {
    const [method, setMethod] = useState('card');
    const [processing, setProcessing] = useState(false);

    const handleJobPayment = async () => {
      setProcessing(true);
      try {
        await handlePayment(job, { method });
        onSuccess();
      } finally {
        setProcessing(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center justify-between mb-6 pb-6 border-b">
            <h3 className="text-2xl font-black flex items-center gap-3">
              <CreditCard className="text-indigo-600" />
              Payment
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-sm text-gray-600">Amount: <span className="font-black text-indigo-600">RM {job.totalPrice?.toFixed(2) || job.price?.toFixed(2)}</span></p>
            
            <div className="space-y-2">
              {['card', 'ewallet'].map(m => (
                <label key={m} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  method === m ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}>
                  <input type="radio" name="payment" value={m} checked={method === m} onChange={(e) => setMethod(e.target.value)} />
                  <span className="font-bold capitalize">{m === 'card' ? 'Credit Card' : 'E-Wallet'}</span>
                </label>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleJobPayment}
            disabled={processing}
            loading={processing}
            className="w-full mb-3"
          >
            {processing ? 'Processing...' : 'Pay Now'}
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  // Delivery Modal
  const DeliveryModalComponent = ({ job, onClose, onSuccess }) => {
    const [option, setOption] = useState('pickup');
    const [location, setLocation] = useState('main');
    const [address, setAddress] = useState('');
    const [processing, setProcessing] = useState(false);

    const eligibleForFree = job.price >= 50;
    const deliveryCharge = eligibleForFree ? 0 : 8.00;
    const totalPrice = option === 'pickup' 
      ? job.price 
      : (job.price + deliveryCharge);

    const handleSubmit = async () => {
      if (option === 'delivery' && !address.trim()) {
        toast.error('Please enter delivery address');
        return;
      }

      setProcessing(true);
      try {
        await handleDelivery(job, {
          option,
          charge: deliveryCharge,
          address: option === 'delivery' ? address : null,
          location: option === 'pickup' ? location : null,
          totalPrice
        });
        onSuccess();
      } finally {
        setProcessing(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6 pb-6 border-b">
            <h3 className="text-2xl font-black flex items-center gap-3">
              <Truck className="text-emerald-600" />
              Delivery
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {/* Pickup Option */}
            <button
              onClick={() => setOption('pickup')}
              className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                option === 'pickup' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
              }`}
            >
              <p className="font-black text-lg">Self Pickup</p>
              <p className="text-sm text-gray-500">Free</p>
              {option === 'pickup' && (
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="loc" value="main" checked={location === 'main'} onChange={(e) => setLocation(e.target.value)} />
                    Main Store
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="loc" value="north" checked={location === 'north'} onChange={(e) => setLocation(e.target.value)} />
                    North Branch
                  </label>
                </div>
              )}
            </button>

            {/* Delivery Option */}
            <button
              onClick={() => setOption('delivery')}
              className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                option === 'delivery' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              <p className="font-black text-lg">Home Delivery</p>
              <p className="text-sm text-gray-500">{eligibleForFree ? 'FREE (≥RM50)' : `RM ${deliveryCharge.toFixed(2)}`}</p>
              {option === 'delivery' && (
                <input 
                  type="text"
                  placeholder="Enter address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full mt-3 p-2 border rounded text-sm"
                />
              )}
            </button>
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 p-4 rounded-xl mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Order Total:</span>
              <span className="font-black">RM {job.price?.toFixed(2)}</span>
            </div>
            {option === 'delivery' && (
              <div className="flex justify-between text-sm mb-2">
                <span>Delivery:</span>
                <span className="font-black">{eligibleForFree ? 'FREE' : `RM ${deliveryCharge.toFixed(2)}`}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-lg font-black">
              <span>Total:</span>
              <span className="text-indigo-600">RM {totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={processing}
            loading={processing}
            className="w-full mb-3"
          >
            Continue to Payment
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  const JobCard = ({ job }) => (
    <div 
      onClick={() => handleEdit(job)}
      className="group bg-white dark:bg-zinc-900 p-5 rounded-[2.5rem] border border-transparent hover:border-indigo-100 dark:hover:border-zinc-700 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden cursor-pointer"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-5">
          {/* File Preview Thumbnail */}
          <div 
            className="relative w-16 h-16 rounded-2xl overflow-hidden cursor-pointer shadow-inner border border-zinc-100 group/thumb"
            onClick={(e) => { e.stopPropagation(); job.filePreview && setSelectedPreview(job); }}
          >
            {job.filePreview ? (
              <>
                {job.fileType?.includes('pdf') ? (
                  <div className="w-full h-full bg-rose-50 flex items-center justify-center text-rose-500">
                    <FileText size={24} />
                  </div>
                ) : isWordDoc(job.fileType, job.fileName) ? (
                  <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-500">
                    <FileCode size={24} />
                  </div>
                ) : (
                  <img 
                     src={job.filePreview} 
                    alt="Thumbnail" 
                    className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-zinc-900/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                  <Eye size={16} className="text-white" />
                </div>
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                job.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {job.status === 'completed' ? <CheckCircle size={24} /> : <FileText size={24} />}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-black text-xl text-zinc-900 dark:text-white leading-tight">
                {job.customerName}
              </h4>
              <Badge variant={job.status === 'completed' ? 'success' : job.status === 'ready' ? 'secondary' : 'outline'} className="text-[8px] uppercase tracking-[0.3em] py-1 px-2">
                {job.status === 'completed' ? 'Completed' : job.status === 'ready' ? 'Ready' : 'Pending'}
              </Badge>
              {job.paymentStatus === 'paid' ? (
                <Badge variant="info" className="text-[8px] uppercase tracking-[0.3em] py-1 px-2">Paid</Badge>
              ) : (
                <Badge variant="warning" className="text-[8px] uppercase tracking-[0.3em] py-1 px-2">Unpaid</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span className="font-semibold uppercase tracking-[0.22em] text-zinc-400">{job.serviceType || 'Print'}</span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                {job.pages} {job.pages === 1 ? 'copy' : 'copies'}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                {job.color} Mode
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/30" />
                {job.paperSize} • {job.binding}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-4 md:pt-0">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest leading-none mb-1">
              Total
            </p>
            <p className="text-2xl font-black text-indigo-600 font-mono tracking-tight">
              RM {(job.totalPrice || job.price)?.toFixed(2)}
            </p>
          </div>
          <div className="flex gap-2">
            {job.paymentStatus === 'unpaid' && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeliveryModal(job); }}
                  className="w-11 h-11 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-90 shadow-sm"
                  title="Select Delivery"
                >
                  <Truck size={20} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setPaymentModal(job); }}
                  className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-90 shadow-sm"
                  title="Make Payment"
                >
                  <DollarSign size={20} />
                </button>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {(job.status === 'pending' || job.status === 'processing') && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); updateStatus(job, 'ready'); }}
                    className="h-11 px-4 bg-amber-500 text-white rounded-2xl flex items-center justify-center hover:bg-amber-600 transition-all active:scale-95 shadow-sm"
                    title="Mark as Ready"
                  >
                    Ready
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); updateStatus(job, 'completed'); }}
                    className="h-11 px-4 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95 shadow-sm"
                    title="Mark as Completed"
                  >
                    Complete
                  </button>
                </>
              )}
              {job.status === 'ready' && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); updateStatus(job, 'completed'); }}
                    className="h-11 px-4 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95 shadow-sm"
                    title="Complete Job"
                  >
                    Complete
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); updateStatus(job, 'pending'); }}
                    className="w-11 h-11 bg-zinc-100 text-zinc-500 rounded-2xl flex items-center justify-center hover:bg-zinc-200 transition-all active:scale-90"
                    title="Revert to Pending"
                  >
                    <Clock size={20} />
                  </button>
                </>
              )}
              {job.status === 'completed' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); updateStatus(job, 'pending'); }}
                  className="w-11 h-11 bg-zinc-100 text-zinc-500 rounded-2xl flex items-center justify-center hover:bg-zinc-200 transition-all active:scale-90"
                  title="Reopen Job"
                >
                  <Clock size={20} />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); handleEdit(job); }} 
                className="w-11 h-11 bg-zinc-50 text-zinc-500 rounded-2xl flex items-center justify-center hover:bg-white hover:shadow-md transition-all active:scale-90"
                title="View Job"
              >
                <Eye size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Modals */}
      <FilePreviewModal />
      {paymentModal && (
        <PaymentModalComponent 
          job={paymentModal}
          onClose={() => setPaymentModal(null)}
          onSuccess={() => {
            setPaymentModal(null);
            toast.success('Payment processed!');
          }}
        />
      )}
      {deliveryModal && (
        <DeliveryModalComponent 
          job={deliveryModal}
          onClose={() => setDeliveryModal(null)}
          onSuccess={() => {
            setDeliveryModal(null);
            toast.success('Delivery option saved!');
          }}
        />
      )}

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 px-4 pb-20">
        
        {/* LEFT: CONFIGURATOR */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-zinc-800 p-8 shadow-2xl shadow-indigo-500/5">
            <div className="flex justify-between items-center mb-8">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 text-zinc-900 dark:text-white">
                  <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                    <Printer size={20} />
                  </div>
                  {editingJob ? 'View Job Details' : 'Quick Configure'}
                </h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">
                  Specify print details
                </p>
              </div>
              {editingJob && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetForm}
                  className="rounded-full bg-zinc-100 hover:bg-zinc-200"
                >
                  <X size={16} />
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {!editingJob && <FileUploadArea />}

              {/* Customer & Pages */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-1 tracking-widest">
                    Customer
                  </label>
                  <Input 
                    placeholder="Client name..." 
                    className="h-12 rounded-2xl bg-white/50 border-zinc-200 focus:bg-white"
                    value={form.customerName}
                    onChange={(e) => updateFormField('customerName', e.target.value)}
                    disabled={!!editingJob}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-1 tracking-widest">
                    Copies
                  </label>
                  <Input 
                    type="number" 
                    min="1"
                    className="h-12 rounded-2xl bg-white/50 border-zinc-200 focus:bg-white font-mono"
                    value={form.pages}
                    onChange={(e) => updateFormField('pages', parseInt(e.target.value) || 1)}
                    disabled={!!editingJob}
                  />
                </div>
              </div>

              {/* Color Mode */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-1 tracking-widest">
                  Color Mode
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-100/50 p-1.5 rounded-2xl border border-zinc-200">
                  {['BW', 'Color'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateFormField('color', m)}
                      disabled={!!editingJob}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        form.color === m 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-900'
                      } ${editingJob ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {m === 'BW' ? 'Black & White' : 'Full Color'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Type */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-1 tracking-widest">
                  Service Type
                </label>
                <div className="flex flex-wrap gap-2 bg-zinc-100/50 p-2 rounded-2xl border border-zinc-200">
                  {(() => {
                    const serviceTypes = ['Print', 'Scan', 'Lamination', 'Binding', 'Design'];
                    if (form.serviceType && !serviceTypes.includes(form.serviceType)) {
                      serviceTypes.push(form.serviceType);
                    }
                    return serviceTypes.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateFormField('serviceType', type)}
                        disabled={!!editingJob}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          form.serviceType === type
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-900'
                        } ${editingJob ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {type}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Paper Size & Binding */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-1 tracking-widest">
                    Paper
                  </label>
                  <div className="relative">
                    <select 
                      className="w-full h-12 px-4 rounded-2xl bg-white/50 border border-zinc-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer"
                      value={form.paperSize}
                      onChange={(e) => updateFormField('paperSize', e.target.value)}
                      disabled={!!editingJob}
                    >
                      <option>A4</option>
                      <option>A3</option>
                      <option>Letter</option>
                    </select>
                    <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-1 tracking-widest">
                    Binding
                  </label>
                  <div className="relative">
                    <select 
                      className="w-full h-12 px-4 rounded-2xl bg-white/50 border border-zinc-200 text-sm font-bold outline-none appearance-none cursor-pointer"
                      value={form.binding}
                      onChange={(e) => updateFormField('binding', e.target.value)}
                      disabled={!!editingJob}
                    >
                      <option>None</option>
                      <option>Staple</option>
                      <option>Spiral</option>
                      <option>Glue</option>
                      <option>Softcover</option>
                      <option>Hardcover</option>
                    </select>
                    <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Price & Submit */}
              <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-end mb-8 px-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-1">
                      {editingJob ? 'Total (RM)' : 'Estimated Total (RM)'}
                    </p>
                    <p className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter font-mono">
                      RM {(editingJob ? (editingJob.totalPrice || editingJob.price || 0) : price).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="info" className="rounded-lg py-1 px-3">Live Pricing</Badge>
                  </div>
                </div>
                {editingJob ? (
                  <Button 
                    onClick={resetForm} 
                    className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 bg-zinc-600 hover:bg-zinc-700 text-white"
                  >
                    Close View
                  </Button>
                ) : (
                  <Button 
                    onClick={submitJob} 
                    disabled={loading || !file} 
                    className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin w-6 h-6 mr-2" />
                    ) : null}
                    {loading ? 'Processing...' : 'Add to Queue'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-amber-50 rounded-3xl border border-amber-100 p-4 flex gap-4 items-start">
            <div className="p-2 bg-white rounded-xl text-amber-500 shadow-sm shrink-0">
              <Info size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 leading-snug">
                Note: Orders in queue are processed based on arrival time. Complex binding may add 15-20 mins.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: LIVE QUEUE */}
        <div className="lg:col-span-7">
          <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl rounded-[3rem] p-6 border border-white dark:border-zinc-800 shadow-xl">
            <div className="p-6 flex items-center justify-between mb-2">
              <div className="space-y-1">
                <h3 className="text-2xl font-black flex items-center gap-3 text-zinc-900 dark:text-white">
                  <Clock className="text-indigo-600 animate-pulse" /> 
                  Active Operations 
                </h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-9 italic">
                  Real-time status tracking
                </p>
              </div>
              <div className="flex gap-2">
                <div className="px-4 py-2 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                  {jobs.length} Jobs
                </div>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[850px] pr-2 pb-6 px-2" style={{ scrollbarWidth: 'thin' }}>
              {jobs.length === 0 ? (
                <div className="text-center py-28 bg-white/60 rounded-[3rem] border border-white shadow-inner">
                  <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Printer size={48} className="text-zinc-200" />
                  </div>
                  <p className="font-black text-zinc-300 uppercase tracking-widest text-lg">
                    Queue is empty
                  </p>
                  <p className="text-xs text-zinc-400 font-medium mt-2 italic">
                    Ready for new submissions
                  </p>
                </div>
              ) : (
                jobs.map((job) => <JobCard key={job.id} job={job} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingPage;
