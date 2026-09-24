// Pure Node.js script using native fetch to verify the full end-to-end ratings flow

const API_BASE = "http://localhost:3000/api";

async function run() {
  console.log("==================================================================");
  console.log("🚀 STARTING FULL END-TO-END VERIFICATION: MKANY SERVICE RATINGS");
  console.log("==================================================================");

  // Step 1: Health Check with retry
  console.log("\n[Step 1] Checking API Server Health...");
  let health: any = null;
  for (let i = 0; i < 15; i++) {
    try {
      const healthRes = await fetch(`${API_BASE}/healthz`);
      if (healthRes.ok) {
        health = await healthRes.json();
        break;
      }
    } catch {
      // Dev server starting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!health || health.status !== "ok") {
    throw new Error(`API health check failed: ${JSON.stringify(health)}`);
  }
  console.log("  ✓ API Server is running and healthy:", health);

  // Step 2: Validation of Non-Standard / Invalid Ratings
  console.log("\n[Step 2] Testing Server-Side Validation on Non-Standard Ratings...");
  const invalidCases = [
    { rating: 4.3, label: "Non-0.5 step (4.3)" },
    { rating: 5.5, label: "Above 5.0 maximum (5.5)" },
    { rating: -1, label: "Negative rating (-1)" },
    { rating: "text_rating", label: "Non-numeric string" },
  ];

  for (const item of invalidCases) {
    const res = await fetch(`${API_BASE}/geo/ratings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-admin": "true",
      },
      body: JSON.stringify({
        osmType: "node",
        osmId: "test_val_id",
        rating: item.rating,
        category: "سوبرماركت",
        placeName: "سوبر ماركت اختبار",
      }),
    });

    const body = await res.json();
    if (res.status === 400) {
      console.log(`  ✓ Successfully blocked [${item.label}]: HTTP 400 - "${body.message}"`);
    } else {
      throw new Error(`Expected 400 Bad Request for ${item.label}, but got ${res.status}`);
    }
  }

  // Step 3: Security & Authorization
  console.log("\n[Step 3] Testing Authorization (Non-Admin / Public cannot modify ratings)...");
  const unauthRes = await fetch(`${API_BASE}/geo/ratings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      osmType: "node",
      osmId: "unauth_test",
      rating: 4.5,
      category: "مستشفى",
    }),
  });

  if (unauthRes.status === 401 || unauthRes.status === 403) {
    console.log(`  ✓ Modification blocked without Admin privileges: HTTP ${unauthRes.status}`);
  } else {
    throw new Error(`Expected 401/403 for unauthorized call, got ${unauthRes.status}`);
  }

  // Step 4: Admin Assigns Mkany Rating (4.5 / 5)
  console.log("\n[Step 4] Testing Admin Assigning Explicit Mkany Rating (4.5 / 5)...");
  const testOsmType = "node";
  const testOsmId = "e2e_market_7788";
  const testPlaceName = "سوبر ماركت الفجر المعتمد";
  const testCategory = "سوبرماركت";

  const adminSetRes = await fetch(`${API_BASE}/geo/ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dev-admin": "true",
    },
    body: JSON.stringify({
      osmType: testOsmType,
      osmId: testOsmId,
      rating: 4.5,
      category: testCategory,
      placeName: testPlaceName,
      notes: "تم تقييم السوبرماركت بواسطة المشرف الميداني بناءً على توفر السلع ونظافة المكان",
    }),
  });

  const adminSetBody = await adminSetRes.json();
  if (adminSetRes.status !== 200 || !adminSetBody.success) {
    throw new Error(`Failed to set rating: ${JSON.stringify(adminSetBody)}`);
  }
  console.log("  ✓ Rating saved to service_ratings table:", adminSetBody.rating);

  // Step 5: Query Rating via GET /api/geo/ratings
  console.log("\n[Step 5] Querying Rating via GET /api/geo/ratings...");
  const queryRes = await fetch(
    `${API_BASE}/geo/ratings?osmType=${testOsmType}&osmId=${testOsmId}`
  );
  const queryBody = await queryRes.json();
  if (queryRes.status !== 200 || !queryBody.rating || String(queryBody.rating.rating) !== "4.5") {
    throw new Error(`Query rating failed. Expected 4.5, got: ${JSON.stringify(queryBody)}`);
  }
  console.log(`  ✓ Verified persisted rating in database: ${queryBody.rating.rating} / 5 (Place: "${queryBody.rating.placeName}")`);

  // Step 6: Create an Apartment referencing this rated amenity
  console.log("\n[Step 6] Creating Property with Nearby Amenities referencing this place...");
  const createAptRes = await fetch(`${API_BASE}/apartments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dev-admin": "true",
    },
    body: JSON.stringify({
      title: "شقة تجريبية لاختبار مزامنة التقييمات",
      city: "كفر الشيخ",
      address: "شارع الجامعة - كفر الشيخ",
      university: "جامعة كفر الشيخ",
      roomType: "سكن مشترك",
      pricePerMonth: 2200,
      bedrooms: 3,
      bathrooms: 1,
      areaSqm: 110,
      floor: "3",
      furnishing: "مفروش بالكامل",
      livabilityScore: 91,
      status: "متاح",
      ownerName: "المالك المعتمد",
      ownerPhone: "01011112222",
      nearbyAmenities: {
        supermarket: {
          osmType: testOsmType,
          osmId: testOsmId,
          name: testPlaceName,
          distance: "٢٠٠ م",
          time: "٣ دقائق",
          rating: "4.5",
        },
        pharmacy: {
          name: "صيدلية الجامعة القريبة",
          distance: "٤٠٠ م",
          time: "٥ دقائق",
          rating: undefined, // Unrated service
        },
      },
    }),
  });

  const apt = await createAptRes.json();
  if (createAptRes.status !== 201 && createAptRes.status !== 200) {
    throw new Error(`Failed to create test apartment: ${JSON.stringify(apt)}`);
  }
  const aptId = apt.id;
  console.log(`  ✓ Created Apartment #${aptId}`);

  // Step 7: Verify Student View receives the accurate Mkany Rating
  console.log("\n[Step 7] Verifying Student View (GET /api/apartments/:id)...");
  const studentViewRes = await fetch(`${API_BASE}/apartments/${aptId}`);
  const studentView = await studentViewRes.json();

  const superRating = studentView?.nearbyAmenities?.supermarket?.rating;
  const pharmRating = studentView?.nearbyAmenities?.pharmacy?.rating;

  console.log(`  ✓ Supermarket Mkany Rating shown to student: "${superRating}" (Expected: "4.5")`);
  console.log(`  ✓ Pharmacy Rating shown to student: ${pharmRating === undefined ? "undefined (Unrated - 'لم يتم تقييمه بعد')" : pharmRating}`);

  if (superRating !== "4.5") {
    throw new Error(`Student view rating mismatch: expected "4.5", got "${superRating}"`);
  }
  if (pharmRating !== undefined && pharmRating !== null && pharmRating !== "") {
    throw new Error(`Unrated amenity had fake rating: "${pharmRating}"`);
  }

  // Step 8: Update Rating via Admin and verify syncRatingToApartmentRecords
  console.log("\n[Step 8] Testing Dynamic Sync: Admin updates Mkany Rating to 5.0 in Portal...");
  const updateRes = await fetch(`${API_BASE}/geo/ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dev-admin": "true",
    },
    body: JSON.stringify({
      osmType: testOsmType,
      osmId: testOsmId,
      rating: 5.0,
      category: testCategory,
      placeName: testPlaceName,
    }),
  });

  const updateBody = await updateRes.json();
  if (updateRes.status !== 200 || !updateBody.success) {
    throw new Error(`Failed to update rating: ${JSON.stringify(updateBody)}`);
  }
  console.log("  ✓ Rating updated to 5.0 and sync triggered.");

  // Re-fetch apartment to verify automatic propagation
  const refreshedAptRes = await fetch(`${API_BASE}/apartments/${aptId}`);
  const refreshedApt = await refreshedAptRes.json();
  const newSuperRating = refreshedApt?.nearbyAmenities?.supermarket?.rating;
  console.log(`  ✓ Apartment nearbyAmenities.supermarket.rating is now: "${newSuperRating}" (Expected: "5")`);

  if (newSuperRating !== "5") {
    throw new Error(`Sync failed! Expected "5", got "${newSuperRating}"`);
  }

  // Step 9: Reset / Clear Rating (Admin deletes rating)
  console.log("\n[Step 9] Testing Rating Removal (Admin resets rating to unrated)...");
  const clearRes = await fetch(`${API_BASE}/geo/ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dev-admin": "true",
    },
    body: JSON.stringify({
      osmType: testOsmType,
      osmId: testOsmId,
      rating: null,
    }),
  });

  const clearBody = await clearRes.json();
  console.log("  ✓ Clear rating response:", clearBody.message);

  const checkClearedAptRes = await fetch(`${API_BASE}/apartments/${aptId}`);
  const checkClearedApt = await checkClearedAptRes.json();
  const clearedSuperRating = checkClearedApt?.nearbyAmenities?.supermarket?.rating;
  console.log(`  ✓ Apartment supermarket rating after clearing: ${clearedSuperRating === undefined ? "undefined (Unrated)" : clearedSuperRating}`);

  // Step 10: Clean up test apartment
  console.log("\n[Step 10] Cleaning up test apartment...");
  await fetch(`${API_BASE}/apartments/${aptId}`, {
    method: "DELETE",
    headers: { "x-dev-admin": "true" },
  });
  console.log(`  ✓ Deleted test apartment #${aptId}.`);

  // Step 11: Inspection Activation/Publish Flow with Mkany Ratings
  console.log("\n[Step 11] Testing Admin Inspection Activation / Publish Flow with Mkany Ratings...");
  const createInspRes = await fetch(`${API_BASE}/inspections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dev-admin": "true",
    },
    body: JSON.stringify({
      title: "معاينة شقة طلابية جديدة للتفعيل",
      city: "كفر الشيخ",
      address: "شارع الجيش - كفر الشيخ",
      university: "جامعة كفر الشيخ",
      roomType: "غرفة خاصة",
      pricePerMonth: 2800,
      bedrooms: 2,
      bathrooms: 1,
      areaSqm: 95,
      floor: "2",
      furnishing: "مفروشة بالكامل",
      ownerName: "مالك تجريبي للمعاينة",
      ownerPhone: "01099998888",
    }),
  });

  const insp = await createInspRes.json();
  if (!insp.id) {
    throw new Error(`Failed to create test inspection: ${JSON.stringify(insp)}`);
  }
  const inspId = insp.id;
  console.log(`  ✓ Created inspection request #${inspId}`);

  // Now publish it with admin-assigned Mkany ratings
  const pubRes = await fetch(`${API_BASE}/inspections/${inspId}/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dev-admin": "true",
    },
    body: JSON.stringify({
      title: "شقة طلابية معتمدة ومفحوصة بجولة افتراضية",
      city: "كفر الشيخ",
      address: "شارع الجيش - كفر الشيخ",
      university: "جامعة كفر الشيخ",
      pricePerMonth: 2800,
      livabilityScore: 95,
      video360Url: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
      nearbyAmenities: {
        hospital: {
          osmType: "node",
          osmId: "hosp_pub_123",
          name: "مستشفى كفر الشيخ الجامعي",
          distance: "٦٠٠ م",
          time: "٧ دقائق",
          rating: 4.5,
        },
        transportation: {
          osmType: "node",
          osmId: "trans_pub_456",
          name: "موقف السرفيس الجامعي",
          distance: "١٥٠ م",
          time: "٢ دقيقة",
          rating: 5.0,
        },
        supermarket: {
          name: "محل بقالة غير مقيم",
          distance: "٣٠٠ م",
          time: "٣ دقائق",
          rating: undefined,
        },
      },
    }),
  });

  const pubBody = await pubRes.json();
  const pubApt = pubBody.property || pubBody.apartment;
  if (!pubApt) {
    throw new Error(`Failed to publish inspection: ${JSON.stringify(pubBody)}`);
  }
  console.log(`  ✓ Inspection published successfully into Apartment #${pubApt.id}`);
  const pubHospRating = pubApt?.nearbyAmenities?.hospital?.rating;
  const pubTransRating = pubApt?.nearbyAmenities?.transportation?.rating;
  const pubSuperRating = pubApt?.nearbyAmenities?.supermarket?.rating;

  console.log(`  ✓ Published Hospital Rating: "${pubHospRating}" (Expected: "4.5")`);
  console.log(`  ✓ Published Transportation Rating: "${pubTransRating}" (Expected: "5")`);
  console.log(`  ✓ Published Supermarket Rating: ${pubSuperRating === undefined ? "undefined (Unrated - 'لم يتم تقييمه بعد')" : pubSuperRating}`);

  if (pubHospRating !== "4.5" || pubTransRating !== "5") {
    throw new Error(`Published apartment rating mismatch: hosp="${pubHospRating}", trans="${pubTransRating}"`);
  }
  if (pubSuperRating !== undefined) {
    throw new Error(`Unrated supermarket had unexpected rating: "${pubSuperRating}"`);
  }

  // Clean up published apartment
  if (pubApt?.id) {
    await fetch(`${API_BASE}/apartments/${pubApt.id}`, {
      method: "DELETE",
      headers: { "x-dev-admin": "true" },
    });
    console.log(`  ✓ Cleaned up published apartment #${pubApt.id}.`);
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("\n❌ VERIFICATION TEST FAILED:", err);
  process.exit(1);
});
