// =====================================================
// SUMIT FF STORE - MAIN SCRIPT
// PREMIUM FRONTEND + FIREBASE + TELEGRAM ORDER SYSTEM
// =====================================================

import {
  auth,
  db,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "./firebase.js";


// =====================================================
// PAGE ELEMENTS
// =====================================================

const storePage =
  document.getElementById("storePage");

const paymentPage =
  document.getElementById("paymentPage");

const accountPage =
  document.getElementById("accountPage");

const purchasesPage =
  document.getElementById("purchasesPage");

const historyPage =
  document.getElementById("historyPage");


// =====================================================
// CURRENT ORDER
// =====================================================

let currentID = "FF ID";
let currentPrice = 0;

let purchasesUnsubscribe = null;
let historyUnsubscribe = null;


// =====================================================
// PAGE NAVIGATION
// =====================================================

function showPage(page) {

  [
    storePage,
    paymentPage,
    accountPage,
    purchasesPage,
    historyPage
  ].forEach((p) => {

    if (!p) return;

    p.classList.remove("active");
    p.classList.add("hidden");

  });


  if (page) {

    page.classList.remove("hidden");
    page.classList.add("active");

  }

     const bottom = document.querySelector(".bottom");

if (bottom) {
  bottom.style.display =
    (page === paymentPage || page === accountPage)
      ? "none"
      : "";
}
  
  window.scrollTo(0, 0);

}


// =====================================================
// STORE
// =====================================================

window.openStore = function(push = true) {

  showPage(storePage);

  if (push) {

    history.pushState(
      { page: "store" },
      "",
      "#store"
    );

  }

};


// =====================================================
// PAYMENT PAGE
// =====================================================

window.openPayment = function(push = true) {

  showPage(paymentPage);

  if (push) {

    history.pushState(
      { page: "payment" },
      "",
      "#payment"
    );

  }

};


// =====================================================
// ACCOUNT PAGE
// =====================================================

window.openAccount = function(push = true) {

  showPage(accountPage);

  if (push) {

    history.pushState(
      { page: "account" },
      "",
      "#account"
    );

  }

};


// =====================================================
// HOME
// =====================================================

window.goHome = function(push = true) {

  showPage(storePage);

  if (push) {

    history.pushState(
      { page: "store" },
      "",
      "#store"
    );

  }

};


// =====================================================
// BROWSER BACK
// =====================================================

window.addEventListener(
  "popstate",
  function (event) {

    const page =
      event.state?.page || "store";


    if (page === "payment") {

      showPage(paymentPage);

    }

    else if (page === "account") {

      showPage(accountPage);

    }

    else if (page === "purchases") {

      showPage(purchasesPage);

    }

    else if (page === "history") {

      showPage(historyPage);

    }

    else {

      showPage(storePage);

    }

  }
);


// =====================================================
// INITIAL HISTORY
// =====================================================

if (!history.state) {

  history.replaceState(
    { page: "store" },
    "",
    "#store"
  );

}


// =====================================================
// BUY NOW
// =====================================================

window.buyNow = function(name, price) {

  currentID = name;
  currentPrice = Number(price);
  
      const paymentQR =
    document.getElementById("paymentQR");

  const paymentUpiBox =
    document.getElementById("paymentUpiBox");

  if (currentPrice >= 2000) {

    // ₹2000+ → UPI ID
    if (paymentQR) {
      paymentQR.style.display = "none";
    }

    if (paymentUpiBox) {
      paymentUpiBox.style.display = "block";
    }

  } else {

    // Below ₹2000 → QR
    if (paymentQR) {
      paymentQR.style.display = "block";
    }

    if (paymentUpiBox) {
      paymentUpiBox.style.display = "none";
    }

  }


  const title =
    document.getElementById("payTitle");

  const amount =
    document.getElementById("payAmount");


  if (title) {

    title.innerText = name;

  }


  if (amount) {

    amount.innerText =
      "₹" + price;

  }


  window.currentID = name;
  window.currentPrice = Number(price);


  openPayment();

};


// =====================================================
// UPI PAYMENT
// =====================================================

window.payUPI = function() {

  const upi =
    "mauryasell@fam";


  const url =
    `upi://pay?pa=${encodeURIComponent(upi)}` +
    `&pn=SumitFFStore` +
    `&am=${encodeURIComponent(currentPrice)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(currentID)}`;


  window.location.href = url;

};


// =====================================================
// MY PURCHASES
// =====================================================

window.openPurchases = function() {

  const user =
    auth.currentUser;


  if (!user) {

    if (typeof showPopup === "function") {

      showPopup(
        "Login Required",
        "Please login to view your purchases.",
        "info",
        "🔐"
      );

    }

    openAccount();

    return;

  }


  showPage(purchasesPage);


  history.pushState(
    { page: "purchases" },
    "",
    "#purchases"
  );


  loadPurchases(user.uid);

};


// =====================================================
// HISTORY
// =====================================================

window.openHistory = function() {

  const user =
    auth.currentUser;


  if (!user) {

    if (typeof showPopup === "function") {

      showPopup(
        "Login Required",
        "Please login to view your order history.",
        "info",
        "🔐"
      );

    }

    openAccount();

    return;

  }


  showPage(historyPage);


  history.pushState(
    { page: "history" },
    "",
    "#history"
  );


  loadHistory(user.uid);

};


// =====================================================
// LOAD HISTORY
// =====================================================

function loadHistory(uid) {

  const loading =
    document.getElementById(
      "historyLoading"
    );

  const empty =
    document.getElementById(
      "historyEmpty"
    );

  const list =
    document.getElementById(
      "historyList"
    );


  if (!loading || !empty || !list) {

    return;

  }


  loading.style.display =
    "block";

  empty.style.display =
    "none";

  list.innerHTML = "";


  if (historyUnsubscribe) {

    historyUnsubscribe();

    historyUnsubscribe = null;

  }


  const ordersRef =
    collection(
      db,
      "orders"
    );


  const q =
    query(
      ordersRef,
      where(
        "uid",
        "==",
        uid
      )
    );


  historyUnsubscribe =
    onSnapshot(
      q,
      (snapshot) => {

        loading.style.display =
          "none";

        list.innerHTML = "";


        if (snapshot.empty) {

          empty.style.display =
            "block";

          return;

        }


        empty.style.display =
          "none";


        const docs =
          [...snapshot.docs].sort(
            (a, b) => {

              const aTime =
                a.data()
                 .createdAt
                 ?.toMillis?.() || 0;


              const bTime =
                b.data()
                 .createdAt
                 ?.toMillis?.() || 0;


              return bTime - aTime;

            }
          );


        docs.forEach(
          (docSnap) => {

            const order =
              docSnap.data();


            const status =
              String(
                order.status ||
                "pending"
              ).toLowerCase();


            let statusClass =
              "status-pending";

            let statusText =
              "UNDER VERIFICATION";


            if (
              status === "approved"
            ) {

              statusClass =
                "status-approved";

              statusText =
                "PAYMENT VERIFIED";

            }


            if (
              status === "rejected"
            ) {

              statusClass =
                "status-rejected";

              statusText =
                "PAYMENT REJECTED";

            }


            if (
              status === "delivered"
            ) {

              statusClass =
                "status-delivered";

              statusText =
                "ID DELIVERED";

            }


            let date =
              "Date unavailable";


            if (
              order.createdAt?.toDate
            ) {

              date =
                order.createdAt
                  .toDate()
                  .toLocaleString(
                    "en-IN"
                  );

            }


            const card =
              document.createElement(
                "div"
              );


            card.className =
              "premium-order-card";


            card.innerHTML = `

              <div class="order-card-top">

                <div>

                  <div class="order-label">
                    FREE FIRE ACCOUNT
                  </div>

                  <div class="order-account">
                    ${order.account || "FF ID"}
                  </div>

                </div>

                <div class="premium-status ${statusClass}">
                  ${statusText}
                </div>

              </div>

              <div class="order-amount">
                ₹${order.amount || 0}
              </div>

              <div class="order-details">

                <div>
                  <span>📱</span>
                  Mobile
                  <strong>
                    ${order.phone || "Not available"}
                  </strong>
                </div>

                <div>
                  <span>🔢</span>
                  UTR
                  <strong>
                    ${
                      order.utr
                      ? "••••••" +
                        String(order.utr).slice(-6)
                      : "Not available"
                    }
                  </strong>
                </div>

                <div>
                  <span>📅</span>
                  Order Date
                  <strong>
                    ${date}
                  </strong>
                </div>

              </div>

            `;


            list.appendChild(card);

          }
        );

      },

      (error) => {

        console.error(
          "History error:",
          error
        );


        loading.style.display =
          "none";


        list.innerHTML = `

          <div class="premium-error">

            Unable to load order history.

            <br>

            <small>
              ${error.message}
            </small>

          </div>

        `;

      }
    );

}


// =====================================================
// LOAD PURCHASES
// APPROVED + DELIVERED
// =====================================================

function loadPurchases(uid) {

  const loading =
    document.getElementById(
      "purchasesLoading"
    );

  const empty =
    document.getElementById(
      "purchasesEmpty"
    );

  const list =
    document.getElementById(
      "purchasesList"
    );


  if (!loading || !empty || !list) {

    return;

  }


  loading.style.display =
    "block";

  empty.style.display =
    "none";

  list.innerHTML = "";


  if (purchasesUnsubscribe) {

    purchasesUnsubscribe();

    purchasesUnsubscribe = null;

  }


  const ordersRef =
    collection(
      db,
      "orders"
    );


  const q =
    query(
      ordersRef,
      where(
        "uid",
        "==",
        uid
      )
    );


  purchasesUnsubscribe =
    onSnapshot(
      q,
      (snapshot) => {

        loading.style.display =
          "none";

        list.innerHTML = "";


        const approvedOrders =
          snapshot.docs
            .filter(
              (docSnap) => {

                const status =
                  String(
                    docSnap.data()
                      .status || ""
                  ).toLowerCase();


                return (
                  status === "approved" ||
                  status === "delivered"
                );

              }
            )
            .sort(
              (a, b) => {

                const aTime =
                  a.data()
                    .createdAt
                    ?.toMillis?.() || 0;


                const bTime =
                  b.data()
                    .createdAt
                    ?.toMillis?.() || 0;


                return bTime - aTime;

              }
            );


        // =========================================
        // NO PURCHASE
        // =========================================

        if (
          approvedOrders.length === 0
        ) {

          empty.style.display =
            "block";


          empty.innerHTML = `

            <div class="empty-icon">
              🛍️
            </div>

            <h2>
              No Purchases Yet
            </h2>

            <p>
              Your purchased FF IDs will appear here
              after your payment is approved.
            </p>

            <div class="empty-note">
              🔐 Your current orders are under verification.
            </div>

          `;


          return;

        }


        empty.style.display =
          "none";


        // =========================================
        // PURCHASE CARDS
        // =========================================

        approvedOrders.forEach(
          (docSnap) => {

            const order =
              docSnap.data();


            const status =
              String(
                order.status || ""
              ).toLowerCase();


            const statusClass =
              status === "delivered"
              ? "status-delivered"
              : "status-approved";


            const statusText =
              status === "delivered"
              ? "ID DELIVERED"
              : "PAYMENT VERIFIED";


            let date =
              "Date unavailable";


            if (
              order.createdAt?.toDate
            ) {

              date =
                order.createdAt
                  .toDate()
                  .toLocaleString(
                    "en-IN"
                  );

            }


            const card =
              document.createElement(
                "div"
              );


            card.className =
              "premium-order-card purchased-card";


            card.innerHTML = `

              <div class="verified-line">
                ✓ VERIFIED PURCHASE
              </div>

              <div class="order-card-top">

                <div>

                  <div class="order-label">
                    FREE FIRE ACCOUNT
                  </div>

                  <div class="order-account">
                    ${order.account || "FF ID"}
                  </div>

                </div>

                <div class="premium-status ${statusClass}">
                  ${statusText}
                </div>

              </div>

              <div class="order-amount">
                ₹${order.amount || 0}
              </div>

              <div class="purchase-message">

                🎮 Your payment has been verified.
                <br>

                Your FF ID is now confirmed as purchased.

              </div>

              <div class="order-details">

                <div>
                  <span>📱</span>
                  Mobile
                  <strong>
                    ${order.phone || "Not available"}
                  </strong>
                </div>

                <div>
                  <span>📅</span>
                  Purchase Date
                  <strong>
                    ${date}
                  </strong>
                </div>

              </div>

            `;


            list.appendChild(card);

          }
        );

      },

      (error) => {

        console.error(
          "Purchases error:",
          error
        );


        loading.style.display =
          "none";


        list.innerHTML = `

          <div class="premium-error">

            Unable to load purchases.

            <br>

            <small>
              ${error.message}
            </small>

          </div>

        `;

      }
    );

}


// =====================================================
// SUBMIT ORDER
// FIRESTORE → TELEGRAM
// =====================================================

window.submitOrder =
  async function () {

    const user =
      auth.currentUser;


    // =========================================
    // LOGIN CHECK
    // =========================================

    if (!user) {

      if (
        typeof showPopup === "function"
      ) {

        showPopup(
          "Login Required",
          "Please login before submitting your payment.",
          "info",
          "🔐"
        );

      }

      openAccount();

      return;

    }


    // =========================================
    // FORM VALUES
    // =========================================

    const phone =
      document
        .getElementById("phone")
        ?.value
        .trim();


    const utr =
      document
        .getElementById("utr")
        ?.value
        .trim();


    const file =
      document
        .getElementById("shot")
        ?.files?.[0];


    const submitBtn =
      document.getElementById(
        "submitBtn"
      );


    const sending =
      document.getElementById(
        "sending"
      );


    const sendingTitle =
      document.getElementById(
        "sendingTitle"
      );


    const sendingText =
      document.getElementById(
        "sendingText"
      );


    const success =
      document.getElementById(
        "success"
      );


    // =========================================
    // MOBILE VALIDATION
    // =========================================

    if (
      !phone ||
      !/^[0-9]{10}$/.test(phone)
    ) {

      if (
        typeof showPopup === "function"
      ) {

        showPopup(
          "Invalid Mobile Number",
          "Please enter a valid 10 digit mobile number.",
          "warning",
          "!"
        );

      }

      return;

    }


    // =========================================
    // UTR VALIDATION
    // =========================================

    if (
      !utr ||
      !/^[0-9]{12}$/.test(utr)
    ) {

      if (
        typeof showPopup === "function"
      ) {

        showPopup(
          "Invalid UTR",
          "Please enter your 12 digit UTR number.",
          "warning",
          "!"
        );

      }

      return;

    }


    // =========================================
    // SCREENSHOT
    // =========================================

    if (!file) {

      if (
        typeof showPopup === "function"
      ) {

        showPopup(
          "Screenshot Required",
          "Please upload your payment screenshot before submitting.",
          "warning",
          "📷"
        );

      }

      return;

    }


    // =========================================
    // SENDING UI
    // =========================================

    if (submitBtn) {

      submitBtn.disabled =
        true;

      submitBtn.style.display =
        "none";

    }


    if (success) {

      success.style.display =
        "none";

    }


    if (sending) {

      sending.style.display =
        "block";

    }


    if (sendingTitle) {

      sendingTitle.innerText =
        "Creating Order...";

    }


    if (sendingText) {

      sendingText.innerText =
        "Please wait while your order is being created.";

    }


    try {

      // =======================================
      // 1. CREATE FIRESTORE ORDER
      // =======================================

      const orderRef =
        await addDoc(
          collection(
            db,
            "orders"
          ),
          {

            uid:
              user.uid,

            email:
              user.email || "",

            account:
              currentID,

            amount:
              Number(currentPrice),

            phone:
              phone,

            utr:
              utr,

            status:
              "pending",

            createdAt:
              serverTimestamp()

          }
        );


      // =======================================
      // ORDER ID
      // =======================================

      const orderId =
        orderRef.id;


      // =======================================
      // 2. TELEGRAM DATA
      // =======================================

      if (sendingTitle) {

        sendingTitle.innerText =
          "Sending...";

      }


      if (sendingText) {

        sendingText.innerText =
          "Uploading payment screenshot and order details.";

      }


      const formData =
        new FormData();


      formData.append(
        "phone",
        phone
      );


      formData.append(
        "utr",
        utr
      );


      formData.append(
        "photo",
        file
      );


      formData.append(
        "account",
        currentID
      );


      formData.append(
        "amount",
        String(currentPrice)
      );


      // IMPORTANT:
      // TELEGRAM APPROVAL BUTTONS
      formData.append(
        "orderId",
        orderId
      );


      // =======================================
      // 3. SEND TELEGRAM
      // =======================================

      const response =
        await fetch(
          "/api/telegram",
          {

            method:
              "POST",

            body:
              formData

          }
        );


      if (!response.ok) {

        const text =
          await response.text();


        throw new Error(
          "Telegram server error: " +
          text
        );

      }


      // =======================================
      // 4. SUCCESS
      // =======================================

      if (sending) {

        sending.style.display =
          "none";

      }


      if (success) {

        success.style.display =
          "block";

      }


      if (submitBtn) {

        submitBtn.disabled =
          false;

      }


      if (
        typeof showPopup === "function"
      ) {

        showPopup(
  "Payment Submitted",
  "Your order has been submitted successfully. You can check your order status for updates.",
  "success",
  "✓"
);

      }

    }

    catch (error) {

      console.error(
        "ORDER ERROR:",
        error
      );


      if (sending) {

        sending.style.display =
          "none";

      }


      if (submitBtn) {

        submitBtn.style.display =
          "block";

        submitBtn.disabled =
          false;

      }


      if (
        typeof showPopup === "function"
      ) {

        showPopup(
          "Something Went Wrong",
          error.message ||
            "Unable to submit your order.",
          "error",
          "×"
        );

      }

    }

  };


// =====================================================
// CARD SLIDERS
// =====================================================

function initializeSliders() {

  document
    .querySelectorAll(".slider")
    .forEach((slider) => {

      const slides =
        slider.querySelectorAll(
          ".slide"
        );


      const left =
        slider.querySelector(
          ".left"
        );


      const right =
        slider.querySelector(
          ".right"
        );


      if (
        !slides.length ||
        !left ||
        !right
      ) {

        return;

      }


      // Prevent duplicate handlers
      if (
        slider.dataset.initialized ===
        "true"
      ) {

        return;

      }


      slider.dataset.initialized =
        "true";


      let index = 0;


      // Find already visible slide
      slides.forEach(
        (slide, number) => {

          if (
            slide.classList.contains(
              "show"
            )
          ) {

            index = number;

          }

        }
      );


      right.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();


          slides[index]
            .classList
            .remove("show");


          index =
            (index + 1) %
            slides.length;


          slides[index]
            .classList
            .add("show");

        }
      );


      left.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();


          slides[index]
            .classList
            .remove("show");


          index =
            (
              index -
              1 +
              slides.length
            ) %
            slides.length;


          slides[index]
            .classList
            .add("show");

        }
      );

    });

}


// =====================================================
// START SLIDERS
// =====================================================

initializeSliders();


// =====================================================
// START STORE
// =====================================================

showPage(storePage);

/* =========================================================
   HOW IT WORKS
========================================================= */

window.scrollHow = function(){

  const section = document.getElementById("how");

  if(!section) return;

  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

};


/* =========================================================
   TERMS PAGE
========================================================= */

window.openTerms = function(){

  const page = document.getElementById("termsPage");

  if(!page) return;

  page.style.display = "flex";
  page.classList.add("active");
  document.body.style.overflow = "hidden";

  history.pushState(
    { page: "terms" },
    "",
    "#terms"
  );

};


/* =========================================================
   CLOSE TERMS
========================================================= */

window.closeTerms = function(){

  const page = document.getElementById("termsPage");

  if(!page) return;

  page.classList.remove("active");
  page.style.display = "none";
  document.body.style.overflow = "";

};


/* =========================================================
   TERMS PHONE BACK
========================================================= */

window.addEventListener("popstate", function(event){

  const page = document.getElementById("termsPage");

  if(
    page &&
    page.classList.contains("active")
  ){

    page.classList.remove("active");
    page.style.display = "none";
    document.body.style.overflow = "";

  }

});

/* =========================================================
   COPY PAYMENT UPI ID
========================================================= */

window.copyUPI = async function(){

  const UPI_ID = "jaiswara@fam";

  try{

    await navigator.clipboard.writeText(UPI_ID);

    const btn =
      document.querySelector(".upi-copy-btn");

    if(btn){

      const oldText = btn.innerText;

      btn.innerText = "COPIED ✓";

      setTimeout(() => {
        btn.innerText = oldText;
      }, 1500);

    }

    
  }catch(error){

    if(window.showPopup){

      window.showPopup(
        "Copy Failed",
        "We couldn't copy the UPI ID automatically. Please copy it manually.",
        "error",
        "✕"
      );

    }

  }

};

window.openProfile512 = function(){

  const profile =
    document.getElementById("profile512");

  if(profile){
    profile.classList.add("active");
    document.body.style.overflow = "hidden";
  }

};


window.closeProfile512 = function(){

  const profile =
    document.getElementById("profile512");

  if(profile){
    profile.classList.remove("active");
    document.body.style.overflow = "";
  }

};

/* IMAGE VIEWER */

document.addEventListener("click", function(e){

  const img = e.target.closest(".slider .slide");

  if(!img) return;

  const viewer =
    document.getElementById("imageViewer");

  const viewerImage =
    document.getElementById("viewerImage");

  if(viewer && viewerImage){

    viewerImage.src = img.src;

    viewer.classList.add("active");

    document.body.style.overflow = "hidden";

  }

});


window.closeImageViewer = function(){

  const viewer =
    document.getElementById("imageViewer");

  if(viewer){

    viewer.classList.remove("active");

    document.body.style.overflow = "";

  }

};

/* =========================================
   APPLY #512 DIRECT PROFILE UI TO ALL POSTS
========================================= */

function applyDirectProfileToAllPosts() {

  document.querySelectorAll(".card .info").forEach((info) => {

    /* Already converted */
    if (info.querySelector(".quick-profile")) return;

    const title = info.querySelector("h2");
    const price = info.querySelector(".price");
    const description = info.querySelector("p");
    const badge = info.querySelector(".badge");
    const buyButton = info.querySelector(".buy");

    if (!title || !price) return;

    const idText = title.innerText.trim();
    const priceText = price.innerText.trim();

    /* Level */
    let level = "...";

    if (description) {
      const levelMatch =
        description.innerText.match(/Level\s+(\d+)/i);

      if (levelMatch) {
        level = levelMatch[1];
      }
    }

    /* Evo Guns */
    let evo = "...";

    if (description) {

      const text =
        description.innerText;

      const evoMatch =
        text.match(/(?:Almost\s+)?(\d+)\s+Evo\s+Guns?/i);

      if (evoMatch) {
        evo = evoMatch[1];
      } else {

        const maxMatch =
          text.match(/(\d+)\s+Evo\s+Gun.*?(\d+)\s+Gun\s+Max/i);

        if (maxMatch) {
          evo =
            maxMatch[1] +
            " + " +
            maxMatch[2] +
            " Max";
        }
      }
    }

    /* Status */
    let available = true;

    if (
      badge &&
      badge.innerText
        .trim()
        .toUpperCase()
        .includes("SOLD")
    ) {
      available = false;
    }

    /* Buy function */
    let buyAction = "";

    if (buyButton) {
      buyAction =
        buyButton.getAttribute("onclick") || "";
    }

    /* Build same UI as FF #512 */
    const profile = document.createElement("div");

    profile.className = "quick-profile";

    profile.innerHTML = `

      <div class="quick-head">

        <span class="quick-id">
          ID: ${idText.replace("FF ID ", "FF ")}
        </span>

        <span
          class="quick-status"
          style="
            color:${available ? "#00ff66" : "#ff3b30"};
          "
        >

          <span
            class="quick-dot"
            style="
              background:${available ? "#00ff66" : "#ff3b30"};
              box-shadow:0 0 8px ${available ? "#00ff66" : "#ff3b30"};
              ${available ? "" : "animation:none;opacity:1;"}
            "
          ></span>

          ${available ? "AVAILABLE" : "SOLD OUT"}

        </span>

      </div>


      <div class="quick-price">

        <span>PRICE</span>

        <strong>${priceText}</strong>

      </div>


      <div class="quick-grid">

        <div class="quick-item level">
          <span>🎮 LEVEL</span>
          <b>${level}</b>
        </div>

        <div class="quick-item likes">
          <span>❤️ LIKES</span>
          <b>...</b>
        </div>

        <div class="quick-item old">
          <span>🕐 OLD</span>
          <b>...</b>
        </div>

        <div class="quick-item evo">
          <span>🔥 EVO GUNS</span>
          <b>${evo}</b>
        </div>

        <div class="quick-item prime">
          <span>🎁 PRIME</span>
          <b>...</b>
        </div>

        <div class="quick-item emotes">
          <span>🎭 EMOTES</span>
          <b>...</b>
        </div>

      </div>


      ${
        available
        ? `
          <button
            class="buy"
            onclick='${buyAction.replace(/'/g, "&apos;")}'
          >
            Buy Now
          </button>
        `
        : `
          <button
            class="buy"
            disabled
            style="
              background:#555;
              color:#fff;
              cursor:not-allowed;
            "
          >
            SOLD OUT
          </button>
        `
      }

    `;

    /* Remove only old info UI */
    title.remove();
    price.remove();

    if (description) {
      description.remove();
    }

    if (badge) {
      badge.remove();
    }

    if (buyButton) {
      buyButton.remove();
    }

    /* Add new #512 style */
    info.appendChild(profile);

  });

}


/* Run after page is loaded */
if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    applyDirectProfileToAllPosts
  );

} else {

  applyDirectProfileToAllPosts();

}