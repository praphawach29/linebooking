import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Star, MessageSquare } from 'lucide-react';
export const MerchantReviews: React.FC = () => {
  const { reviews, bookings } = useSaaS();

  const formatDateThai = (dStr: string) => {
    try {
      const date = new Date(dStr);
      if (isNaN(date.getTime())) return dStr;
      
      const day = date.getDate();
      const monthNames = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear() + 543;
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dStr;
    }
  };

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: totalReviews > 0 ? (reviews.filter(r => r.rating === star).length / totalReviews) * 100 : 0
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">รีวิว & คะแนน</h2>
          <p className="text-slate-500 mt-1">จัดการและดูความพึงพอใจของลูกค้า</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="text-5xl font-black text-foreground mb-2">{averageRating}</div>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${star <= Number(averageRating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`}
              />
            ))}
          </div>
          <p className="text-slate-500 text-sm">จาก {totalReviews} รีวิวทั้งหมด</p>
        </div>

        <div className="md:col-span-2 bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col justify-center space-y-3">
          {ratingCounts.map(({ star, count, percentage }) => (
            <div key={star} className="flex items-center gap-4 text-sm font-bold text-slate-600">
              <div className="flex items-center gap-1 w-12 justify-end">
                <span>{star}</span>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="w-12 text-slate-400 text-right">{count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground">รีวิวล่าสุด</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {reviews.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="font-bold text-lg">ยังไม่มีรีวิว</p>
              <p className="text-sm">เมื่อลูกค้าให้คะแนน รีวิวจะแสดงที่นี่</p>
            </div>
          ) : (
            reviews.map((review) => {
              const booking = bookings.find(b => b.id === review.bookingId);
              return (
                <div key={review.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-foreground">{review.customerName || booking?.customerName || 'ลูกค้าไม่ระบุชื่อ'}</span>
                        <span className="text-slate-400 text-xs">{formatDateThai(review.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-slate-700 text-sm mt-2">{review.comment}</p>
                      )}
                      {booking && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                          <span>บริการ: {booking.serviceName}</span>
                          <span>•</span>
                          <span>พนักงาน: {booking.staffName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
