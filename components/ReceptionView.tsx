
import React from 'react';

interface ReceptionViewProps {
    onBack?: () => void;
}

export const ReceptionView: React.FC<ReceptionViewProps> = ({ onBack }) => {
  return (
    <div className="text-center py-20 text-gray-500">
      <h2 className="text-2xl font-bold mb-2">Tính năng đã được gỡ bỏ</h2>
      <p>Chức năng "Lễ tân" không còn khả dụng.</p>
      {onBack && <button onClick={onBack} className="mt-4 text-teal-600 underline">Quay lại</button>}
    </div>
  );
};
