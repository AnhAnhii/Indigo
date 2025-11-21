
import React, { useState } from 'react';
import { DollarSign, Download, Filter, TrendingUp, Calendar, User } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Employee, TimesheetLog } from '../types';

export const PayrollView: React.FC = () => {
  const { employees, logs } = useGlobalContext();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // --- CORE LOGIC: CALCULATE PAYROLL ---
  // 1. Filter logs for the current month
  // 2. Group by Employee
  // 3. Calculate Total Hours * Hourly Rate (VND)

  const payrollData = employees.map(emp => {
      const empLogs = logs.filter(log => log.employeeName === emp.name);
      
      const totalWorkDays = new Set(empLogs.map(l => l.date)).size;
      const totalHours = empLogs.reduce((sum, log) => sum + log.totalHours, 0);
      
      // Calculation: Salary = Hours * Rate (Rate is now in VND)
      const salaryVND = totalHours * emp.hourlyRate;
      
      // Mock Allowance based on role (VND)
      let allowance = 0;
      if (emp.role === 'Quản lý') allowance = 2000000;
      else if (emp.role === 'Bếp trưởng') allowance = 1000000;
      else allowance = 500000;

      return {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          avatar: emp.name.charAt(0),
          workDays: totalWorkDays,
          totalHours: totalHours.toFixed(1), // Keep 1 decimal
          hourlyRate: emp.hourlyRate,
          baseSalary: salaryVND,
          allowance: allowance,
          totalIncome: salaryVND + allowance,
          status: totalWorkDays > 20 ? 'Đã chốt' : 'Tạm tính'
      };
  });

  // Summary Stats
  const totalPayroll = payrollData.reduce((sum, item) => sum + item.totalIncome, 0);
  const totalWorkDays = payrollData.reduce((sum, item) => sum + item.workDays, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bảng Lương & Tính Công</h2>
          <p className="text-gray-500">Dữ liệu được tính tự động từ chấm công.</p>
        </div>
        <div className="flex space-x-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center hover:bg-gray-50">
                <Download size={18} className="mr-2" /> Xuất Excel
            </button>
            <button className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-teal-700 shadow-sm">
                <DollarSign size={18} className="mr-2" /> Chốt lương tháng {currentMonth}
            </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-6 rounded-2xl shadow-lg shadow-teal-200">
              <p className="text-teal-100 font-medium mb-1">Tổng quỹ lương (Thực tế)</p>
              <h3 className="text-3xl font-bold">{formatCurrency(totalPayroll)}</h3>
              <div className="flex items-center mt-4 text-sm bg-white/20 w-fit px-2 py-1 rounded-lg">
                  <TrendingUp size={14} className="mr-1"/> Cập nhật Real-time
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Tổng công ghi nhận</p>
              <h3 className="text-3xl font-bold text-gray-800">{totalWorkDays} <span className="text-lg text-gray-400 font-normal">ngày</span></h3>
              <div className="flex items-center mt-4 text-sm text-orange-600">
                   <Calendar size={14} className="mr-1"/> Dựa trên {logs.length} lượt chấm công
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Nhân sự tính lương</p>
              <h3 className="text-3xl font-bold text-gray-800">{payrollData.length} <span className="text-lg text-gray-400 font-normal">người</span></h3>
              <p className="text-xs text-gray-400 mt-4">Đã bao gồm nhân sự mới</p>
          </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800">Chi tiết bảng lương tháng {currentMonth}</h3>
            <button className="text-gray-500 hover:text-gray-700 flex items-center text-sm font-medium">
                <Filter size={16} className="mr-1" /> Lọc hiển thị
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                    <tr>
                        <th className="px-6 py-4">Nhân viên</th>
                        <th className="px-6 py-4 text-center">Ngày công</th>
                        <th className="px-6 py-4 text-center">Tổng giờ</th>
                        <th className="px-6 py-4 text-right">Lương cơ bản</th>
                        <th className="px-6 py-4 text-right">Phụ cấp</th>
                        <th className="px-6 py-4 text-right">Thực lĩnh</th>
                        <th className="px-6 py-4 text-center">Trạng thái</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {payrollData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs uppercase">
                                        {item.avatar}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.role} • {item.hourlyRate.toLocaleString('vi-VN')}đ/h</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-gray-700">{item.workDays}</td>
                            <td className="px-6 py-4 text-center text-gray-600 font-mono">{item.totalHours}</td>
                            <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(item.baseSalary)}</td>
                            <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(item.allowance)}</td>
                            <td className="px-6 py-4 text-right font-bold text-teal-600 text-base">{formatCurrency(item.totalIncome)}</td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    item.status === 'Đã chốt' 
                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                }`}>
                                    {item.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {payrollData.length === 0 && (
                         <tr>
                             <td colSpan={7} className="text-center py-8 text-gray-500">Chưa có dữ liệu nhân viên hoặc chấm công</td>
                         </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
