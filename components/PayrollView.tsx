
import React, { useState } from 'react';
import { DollarSign, Download, Filter, TrendingUp, Calendar, User, Plus, X, MinusCircle, PlusCircle } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Employee, TimesheetLog, EmployeeRole, PayrollAdjustment } from '../types';

export const PayrollView: React.FC = () => {
  const { employees, logs, currentUser, payrollAdjustments, addPayrollAdjustment, deletePayrollAdjustment } = useGlobalContext();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedEmpForAdj, setSelectedEmpForAdj] = useState<string>('');
  
  // Adjustment Form
  const [adjType, setAdjType] = useState<'BONUS' | 'FINE' | 'ADVANCE'>('BONUS');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('');

  const isAdmin = currentUser?.role === EmployeeRole.MANAGER || currentUser?.role === EmployeeRole.DEV;

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Helper for Vietnam Timezone Month String (YYYY-MM)
  const getVietnamMonthStr = () => {
      return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 7);
  };

  const currentMonthStr = getVietnamMonthStr();

  const handleAddAdjustment = () => {
      if (!selectedEmpForAdj || adjAmount <= 0) return;
      const newAdj: PayrollAdjustment = {
          id: Date.now().toString(),
          employeeId: selectedEmpForAdj,
          month: currentMonthStr, // Use fixed timezone aware date
          type: adjType,
          amount: adjAmount,
          reason: adjReason,
          date: new Date().toLocaleDateString('vi-VN')
      };
      addPayrollAdjustment(newAdj);
      setIsAdjModalOpen(false);
      setAdjAmount(0);
      setAdjReason('');
  };

  // --- CORE LOGIC: FILTER & CALCULATE PAYROLL ---
  const targetEmployees = isAdmin 
      ? employees 
      : employees.filter(e => e.id === currentUser?.id);

  const payrollData = targetEmployees.map(emp => {
      const empLogs = logs.filter(log => log.employeeName === emp.name); // Should filter by ID & Month in real app
      
      const totalWorkDays = new Set(empLogs.map(l => l.date)).size;
      const totalHours = empLogs.reduce((sum, log) => sum + log.totalHours, 0);
      const salaryVND = totalHours * emp.hourlyRate;
      
      // Get Adjustments for this employee this month
      const empAdjs = payrollAdjustments.filter(a => a.employeeId === emp.id && a.month === currentMonthStr);
      
      const bonus = empAdjs.filter(a => a.type === 'BONUS').reduce((sum, a) => sum + a.amount, 0);
      const fines = empAdjs.filter(a => a.type === 'FINE').reduce((sum, a) => sum + a.amount, 0);
      const advance = empAdjs.filter(a => a.type === 'ADVANCE').reduce((sum, a) => sum + a.amount, 0);

      const allowance = emp.allowance || 0;
      const totalIncome = salaryVND + allowance + bonus - fines - advance;

      return {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          avatar: emp.name.charAt(0),
          workDays: totalWorkDays,
          totalHours: totalHours.toFixed(1),
          hourlyRate: emp.hourlyRate,
          baseSalary: salaryVND,
          allowance,
          bonus,
          fines,
          advance,
          totalIncome,
          adjustments: empAdjs,
          status: totalWorkDays > 20 ? 'Đã chốt' : 'Tạm tính'
      };
  });

  const totalPayroll = payrollData.reduce((sum, item) => sum + item.totalIncome, 0);
  const totalWorkDays = payrollData.reduce((sum, item) => sum + item.workDays, 0);

  const handleExport = () => {
      const headers = ["ID", "Tên", "Tổng giờ", "Lương CB", "Phụ cấp", "Thưởng", "Phạt", "Ứng lương", "Thực lĩnh"];
      const csvRows = [headers.join(",")];

      payrollData.forEach(row => {
          const values = [
              row.id,
              `"${row.name}"`,
              row.totalHours,
              row.baseSalary,
              row.allowance,
              row.bonus,
              row.fines,
              row.advance,
              row.totalIncome
          ];
          csvRows.push(values.join(","));
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Bang_Luong_Thang_${currentMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bảng Lương & Tính Công</h2>
          <p className="text-gray-500">
              {isAdmin ? "Quản lý lương, thưởng, phạt và tạm ứng." : "Chi tiết thu nhập của bạn."}
          </p>
        </div>
        <div className="flex space-x-3">
            <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center hover:bg-gray-50 transition-colors">
                <Download size={18} className="mr-2" /> Xuất Excel
            </button>
            {isAdmin && (
                <button onClick={() => { setIsAdjModalOpen(true); setSelectedEmpForAdj(employees[0]?.id || ''); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-indigo-700 shadow-sm">
                    <PlusCircle size={18} className="mr-2" /> Điều chỉnh (Thưởng/Phạt)
                </button>
            )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-6 rounded-2xl shadow-lg shadow-teal-200">
              <p className="text-teal-100 font-medium mb-1">{isAdmin ? "Tổng quỹ lương (Thực tế)" : "Tổng thu nhập tạm tính"}</p>
              <h3 className="text-3xl font-bold">{formatCurrency(totalPayroll)}</h3>
              <div className="flex items-center mt-4 text-sm bg-white/20 w-fit px-2 py-1 rounded-lg">
                  <TrendingUp size={14} className="mr-1"/> Đã trừ tạm ứng/phạt
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Tổng công ghi nhận</p>
              <h3 className="text-3xl font-bold text-gray-800">{totalWorkDays} <span className="text-lg text-gray-400 font-normal">ngày</span></h3>
              <div className="flex items-center mt-4 text-sm text-orange-600">
                   <Calendar size={14} className="mr-1"/> Dữ liệu chấm công
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Nhân sự tính lương</p>
              <h3 className="text-3xl font-bold text-gray-800">{payrollData.length} <span className="text-lg text-gray-400 font-normal">người</span></h3>
              <p className="text-xs text-gray-400 mt-4">Tháng {currentMonth}</p>
          </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                    <tr>
                        <th className="px-6 py-4">Nhân viên</th>
                        <th className="px-4 py-4 text-center">Giờ</th>
                        <th className="px-4 py-4 text-right">Lương CB</th>
                        <th className="px-4 py-4 text-right">Phụ cấp</th>
                        <th className="px-4 py-4 text-right text-green-600">Thưởng</th>
                        <th className="px-4 py-4 text-right text-red-600">Phạt</th>
                        <th className="px-4 py-4 text-right text-orange-600">Ứng</th>
                        <th className="px-6 py-4 text-right font-bold">Thực lĩnh</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {payrollData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs uppercase">
                                        {item.avatar}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.role}</p>
                                    </div>
                                </div>
                                {/* Adjustment Details Tooltip */}
                                {item.adjustments.length > 0 && (
                                    <div className="text-[10px] text-gray-400 mt-1 pl-11 hidden group-hover:block">
                                        {item.adjustments.map(a => (
                                            <div key={a.id} className="flex gap-2">
                                                <span>{a.type === 'BONUS' ? '+' : '-'} {formatCurrency(a.amount)} ({a.reason})</span>
                                                {isAdmin && <button onClick={() => deletePayrollAdjustment(a.id)} className="text-red-500 hover:underline">Xóa</button>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-4 text-center text-gray-600 font-mono">{item.totalHours}</td>
                            <td className="px-4 py-4 text-right text-gray-600">{formatCurrency(item.baseSalary)}</td>
                            <td className="px-4 py-4 text-right text-gray-600">{formatCurrency(item.allowance)}</td>
                            <td className="px-4 py-4 text-right text-green-600 font-medium">{item.bonus > 0 ? `+${formatCurrency(item.bonus)}` : '-'}</td>
                            <td className="px-4 py-4 text-right text-red-600 font-medium">{item.fines > 0 ? `-${formatCurrency(item.fines)}` : '-'}</td>
                            <td className="px-4 py-4 text-right text-orange-600 font-medium">{item.advance > 0 ? `-${formatCurrency(item.advance)}` : '-'}</td>
                            <td className="px-6 py-4 text-right font-bold text-teal-700 text-base">{formatCurrency(item.totalIncome)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Adjustment Modal */}
      {isAdjModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="font-bold text-lg">Thưởng / Phạt / Ứng lương</h3>
                      <button onClick={() => setIsAdjModalOpen(false)}><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Nhân viên</label>
                          <select value={selectedEmpForAdj} onChange={(e) => setSelectedEmpForAdj(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
                          </select>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Loại điều chỉnh</label>
                          <div className="flex gap-2">
                              <button onClick={() => setAdjType('BONUS')} className={`flex-1 py-2 text-xs font-bold rounded border ${adjType === 'BONUS' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white'}`}>Thưởng (+)</button>
                              <button onClick={() => setAdjType('FINE')} className={`flex-1 py-2 text-xs font-bold rounded border ${adjType === 'FINE' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white'}`}>Phạt (-)</button>
                              <button onClick={() => setAdjType('ADVANCE')} className={`flex-1 py-2 text-xs font-bold rounded border ${adjType === 'ADVANCE' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white'}`}>Ứng (-)</button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Số tiền (VNĐ)</label>
                          <input type="number" value={adjAmount} onChange={(e) => setAdjAmount(Number(e.target.value))} className="w-full border p-2 rounded-lg font-bold text-gray-800"/>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Lý do</label>
                          <input type="text" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="VD: Thưởng doanh số, Đi muộn..." className="w-full border p-2 rounded-lg text-sm"/>
                      </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t">
                      <button onClick={() => setIsAdjModalOpen(false)} className="flex-1 py-2 bg-gray-100 font-bold text-gray-600 rounded-lg">Hủy</button>
                      <button onClick={handleAddAdjustment} className="flex-1 py-2 bg-teal-600 font-bold text-white rounded-lg hover:bg-teal-700">Lưu</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
