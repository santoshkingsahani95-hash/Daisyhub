'use client';

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { ProductReview, Product } from '@/types';

export default function AdminReviewsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(db.getProducts());
  }, []);

  const allReviewsWithProd = products.flatMap((p) =>
    (p.reviews || []).map((r) => ({
      ...r,
      productName: p.name,
      productId: p.id,
    }))
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
          PRODUCT REVIEWS MODERATION
        </h1>
        <p className="text-xs text-brand-muted mt-0.5">Review customer feedback, ratings and verified purchase reviews.</p>
      </div>

      <div className="bg-white rounded-lg border border-brand-border shadow-sm p-6 space-y-4">
        <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider">
          ALL SUBMITTED REVIEWS ({allReviewsWithProd.length})
        </h2>

        {allReviewsWithProd.length === 0 ? (
          <p className="text-xs text-brand-muted py-8 text-center">No reviews submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {allReviewsWithProd.map((rev) => (
              <div key={rev.id} className="p-4 border border-brand-border rounded bg-brand-cream/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-brand-dark">{rev.userName}</span>
                    <span className="text-[10px] text-brand-muted block">Product: {rev.productName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-brand-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className={i < rev.rating ? 'fill-brand-gold' : 'text-brand-border'} />
                    ))}
                    <span className="font-bold text-brand-dark ml-1">{rev.rating}</span>
                  </div>
                </div>

                <p className="text-brand-dark/80 italic">&quot;{rev.comment}&quot;</p>

                <div className="flex justify-between items-center text-[10px] text-brand-muted pt-1">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Verified Buyer • {rev.createdAt}
                  </span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded uppercase">
                    APPROVED & LIVE
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
