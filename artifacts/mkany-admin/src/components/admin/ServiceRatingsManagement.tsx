import React, { useState } from "react";
import { Search, Star, Trash2, Save, MapPin, Plus } from "lucide-react";
import { getServiceRatingsApi, setServiceRatingApi, deleteServiceRatingApi } from "../../lib/api-client";

export function ServiceRatingsManagement({ openToast }: { openToast: (msg: string) => void }) {
  const [osmType, setOsmType] = useState("");
  const [osmId, setOsmId] = useState("");
  const [category, setCategory] = useState("pharmacy");
  const [rating, setRating] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [placeData, setPlaceData] = useState<any>(null);

  const handleSearch = async () => {
    if (!osmType || !osmId) {
      openToast("يجب إدخال نوع ومعرف المكان (OSM Type/ID)");
      return;
    }
    setIsLoading(true);
    try {
      const res = await getServiceRatingsApi({ osmType, osmId, category });
      setPlaceData(res.rating || null);
      if (res.rating) {
        setRating(String(res.rating.rating));
      } else {
        setRating("");
        openToast("لا يوجد تقييم مسجل لهذا المكان");
      }
    } catch (e: any) {
      openToast(e?.message || "فشل تحميل التقييم");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!osmType || !osmId) return;
    const r = parseFloat(rating);
    if (isNaN(r) || r < 0 || r > 5) {
      openToast("التقييم يجب أن يكون بين 0 و 5");
      return;
    }
    
    setIsLoading(true);
    try {
      await setServiceRatingApi({ osmType, osmId, rating: r, category });
      openToast("تم حفظ التقييم بنجاح");
      await handleSearch();
    } catch (e: any) {
      openToast(e?.message || "فشل حفظ التقييم");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!osmType || !osmId) return;
    if (!confirm("هل أنت متأكد من حذف التقييم؟")) return;
    
    setIsLoading(true);
    try {
      await deleteServiceRatingApi(osmType, osmId);
      openToast("تم حذف التقييم");
      setPlaceData(null);
      setRating("");
    } catch (e: any) {
      openToast(e?.message || "فشل حذف التقييم");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-lg">إدارة تقييمات الخدمات</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input placeholder="OSM Type (node/way/relation)" value={osmType} onChange={e => setOsmType(e.target.value)} className="p-2 border rounded" />
        <input placeholder="OSM ID" value={osmId} onChange={e => setOsmId(e.target.value)} className="p-2 border rounded" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="p-2 border rounded">
          <option value="pharmacy">صيدلية</option>
          <option value="supermarket">سوبر ماركت</option>
          <option value="hospital">مستشفى</option>
          <option value="cafeRestaurant">مطاعم وكافيهات</option>
        </select>
        <button onClick={handleSearch} className="bg-primary text-primary-foreground p-2 rounded flex items-center justify-center gap-2">
          <Search size={16} /> بحث
        </button>
      </div>

      {placeData && (
        <div className="border p-4 rounded-xl space-y-4">
          <p><strong>اسم المكان:</strong> {placeData.placeName || "غير محدد"}</p>
          <div className="flex items-center gap-2">
            <Star className="text-amber-500" />
            <input type="number" step="0.5" min="0" max="5" value={rating} onChange={e => setRating(e.target.value)} className="p-2 border rounded w-20" />
            <button onClick={handleSave} className="bg-emerald-600 text-white p-2 rounded flex items-center gap-2">
              <Save size={16} /> حفظ التقييم
            </button>
            <button onClick={handleDelete} className="bg-rose-600 text-white p-2 rounded flex items-center gap-2">
              <Trash2 size={16} /> حذف
            </button>
          </div>
        </div>
      )}
      {!placeData && osmId && !isLoading && (
        <div className="border p-4 rounded-xl space-y-4">
          <p>لا يوجد تقييم مسجل. هل تريد إضافة واحد؟</p>
          <div className="flex items-center gap-2">
            <Star className="text-amber-500" />
            <input type="number" step="0.5" min="0" max="5" value={rating} onChange={e => setRating(e.target.value)} className="p-2 border rounded w-20" />
            <button onClick={handleSave} className="bg-emerald-600 text-white p-2 rounded flex items-center gap-2">
              <Plus size={16} /> إضافة تقييم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
