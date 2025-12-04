
import { GroupOrderItem } from '../types';

interface TableGroup {
    count: number; // Số lượng bàn trong nhóm này
    size: number;  // Số khách mỗi bàn
}

/**
 * Phân tích chuỗi cấu trúc bàn.
 * Hỗ trợ các định dạng:
 * - "2x10, 1x6" (2 bàn 10, 1 bàn 6)
 * - "2 bàn 10, 1 mâm 6"
 * - "10, 10, 6"
 */
export const parseTableAllocation = (input: string): TableGroup[] => {
    if (!input) return [];

    const groups: TableGroup[] = [];
    const normalized = input.toLowerCase().replace(/,/g, ';').replace(/\./g, ';');
    const parts = normalized.split(';');

    parts.forEach(part => {
        const cleanPart = part.trim();
        if (!cleanPart) return;

        // Pattern 1: "2x10" or "2*10"
        const xMatch = cleanPart.match(/(\d+)\s*[x*]\s*(\d+)/);
        if (xMatch) {
            groups.push({ count: parseInt(xMatch[1]), size: parseInt(xMatch[2]) });
            return;
        }

        // Pattern 2: "2 bàn 10" or "2 mâm 6"
        const textMatch = cleanPart.match(/(\d+)\s*(?:bàn|mâm)\s*(\d+)/);
        if (textMatch) {
            groups.push({ count: parseInt(textMatch[1]), size: parseInt(textMatch[2]) });
            return;
        }

        // Pattern 3: "10" (Single table of 10, implied count 1)
        const singleMatch = cleanPart.match(/^(\d+)$/);
        if (singleMatch) {
            groups.push({ count: 1, size: parseInt(singleMatch[1]) });
            return;
        }
    });

    return groups;
};

/**
 * Tính toán lại Note và Số lượng cho danh sách món dựa trên cấu trúc bàn
 */
export const calculateAutoNotes = (items: GroupOrderItem[], allocationStr: string): GroupOrderItem[] => {
    const tableGroups = parseTableAllocation(allocationStr);

    // Tổng số bàn
    const totalTables = tableGroups.reduce((sum, g) => sum + g.count, 0);
    // Tổng số khách (ước tính)
    const totalGuests = tableGroups.reduce((sum, g) => sum + (g.count * g.size), 0);

    if (totalTables === 0) return items; // Không có thông tin bàn, giữ nguyên

    return items.map(item => {
        let newQuantity = item.quantity;
        let newNote = item.note || '';

        const nameLower = item.name.toLowerCase();
        const unitLower = item.unit.toLowerCase();

        // --- SPECIAL CASE 1: SÚP (SOUP) -> LUÔN LÀ THEO ĐẦU NGƯỜI ---
        // Nếu tên món có chữ "Súp" hoặc "Soup" -> Auto set số lượng = số khách
        if (nameLower.includes('súp') || nameLower.includes('soup')) {
            return { ...item, quantity: totalGuests, note: 'Theo đầu người' };
        }

        // --- SPECIAL CASE 2: CƠM / CANH -> LUÔN LÀ MÓN DÙNG CHUNG (SHARED) ---
        // User yêu cầu: Cơm, Canh tính như món ăn chung (theo bàn)
        const isRiceOrSoup = nameLower.includes('cơm') || nameLower.includes('canh');

        // Đơn vị tính theo đầu người (Per-person units)
        const perPersonUnits = ['bát', 'chén', 'suất', 'cốc', 'ly', 'k', 'pax', 'người'];
        const isPerPersonUnit = perPersonUnits.some(u => unitLower.includes(u));

        // Logic: Mặc định là Món Dùng Chung (Shared) TRỪ KHI nó là đơn vị theo đầu người.
        // (Trừ trường hợp Cơm/Canh thì luôn là Shared dù đơn vị là gì)
        const isSharedUnit = isRiceOrSoup || !isPerPersonUnit;

        // ALWAYS RECALCULATE (User explicitly requested it)
        // Reset note if it looks like an auto-generated note to avoid appending
        if (newNote.includes('bàn') || newNote.includes('Chia') || newNote.includes('Theo đầu người')) {
            newNote = '';
        }

        // --- RULE 1: SMART QUANTITY SCALING (Tự động bù/trừ số lượng) ---
        // Logic: Món dùng chung thường có số lượng = số bàn.
        if (isSharedUnit) {
            // Case A: Thiếu (VD: 3 bàn, nhập 1) -> Tăng lên bằng số bàn
            if (newQuantity < totalTables) {
                newQuantity = totalTables;
            }
            // Case B: Dư ít (VD: 3 bàn, nhập 4 - do AI nhận diện thừa bàn lúc trước) -> Giảm về bằng số bàn
            // Chỉ áp dụng nếu chênh lệch nhỏ (<= 1) để tránh sửa nhầm trường hợp khách gọi thêm
            else if (newQuantity > totalTables && (newQuantity - totalTables) <= 1) {
                newQuantity = totalTables;
            }
        }

        // --- RULE 2: DETAILED NOTE SPLITTING (Chia chi tiết theo nhóm bàn) ---
        // Tính số lượng món chia cho mỗi bàn (giả sử chia đều trước)
        const itemsPerTable = Math.floor(newQuantity / totalTables);
        const remainder = newQuantity % totalTables;

        if (itemsPerTable > 0) {
            // Tạo ghi chú chi tiết: "2 đĩa bàn 7; 1 đĩa bàn 6"
            const notesParts: string[] = [];

            tableGroups.forEach(group => {
                const itemsForThisGroup = group.count * itemsPerTable;
                if (itemsForThisGroup > 0) {
                    notesParts.push(`${itemsForThisGroup} ${item.unit} bàn ${group.size}`);
                }
            });

            newNote = notesParts.join(' • ');

            if (remainder > 0) {
                newNote += ` • Dư ${remainder}`;
            }
        } else {
            // Trường hợp Items < Tables (Sau khi đã scale, nghĩa là logic scale không áp dụng hoặc item.unit lạ)
            // Ví dụ: 3 bàn, 2 đĩa (Chia lẻ)
            newNote = `Chia ${newQuantity} ${item.unit} cho ${totalTables} bàn`;
        }

        // --- RULE 3: MÓN ĂN THEO ĐẦU NGƯỜI (Override nếu tỉ lệ khớp) ---
        // Chỉ áp dụng nếu KHÔNG PHẢI là Cơm/Canh (vì Cơm/Canh đã được xử lý là Shared ở trên)
        if (!isRiceOrSoup) {
            const ratio = newQuantity / totalGuests;

            // Nếu số lượng ~ số khách -> Ghi chú "Theo người" cho gọn
            // Chỉ áp dụng với các đơn vị tính theo người (đã define ở trên)
            if (isPerPersonUnit && ratio >= 0.9 && ratio <= 1.1) {
                newNote = 'Theo đầu người';
            }
        }

        return {
            ...item,
            quantity: newQuantity,
            note: newNote
        };
    });
};
