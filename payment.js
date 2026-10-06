const params = new URLSearchParams(location.search);

const id = params.get("id") || "FF ID";
const price = params.get("price") || 999;

document.getElementById("idName").innerText = id;
document.getElementById("amount").innerText = "₹" + price;

document.getElementById("payBtn").onclick = () => {
  location.href =
    `upi://pay?pa=YOURUPI@okicici&pn=SumitFFStore&am=${price}&cu=INR`;
};

const form = document.getElementById("orderForm");

form.onsubmit = async (e) => {
  e.preventDefault();

  const phone = document.getElementById("phone").value.trim();
  const utr = document.getElementById("utr").value.trim();

  if (!/^\d{10}$/.test(phone)) {
    alert("10 digit ka valid Mobile Number dalo.");
    return;
  }

  if (!/^\d{12}$/.test(utr)) {
    alert("12 digit ka valid UTR dalo.");
    return;
  }

  const data = new FormData(form);

  data.append("account", id);
  data.append("amount", price);
  data.append("phone", phone);
  data.append("utr", utr);

  const r = await fetch("/api/telegram", {
    method: "POST",
    body: data
  });

  if (r.ok) {
    alert("Order Submitted Successfully");
    form.reset();
  } else {
    const msg = await r.text();
    alert(msg);
  }
};