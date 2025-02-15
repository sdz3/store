(() => {
  let currentItemData = null;

  const getRarityColor = (rarity) => {
    const colors = {
      Común: "#606060",
      Raro: "#2d5e8c",
      Épico: "#7d42c4",
      Legendario: "#d8a43a",
      Mítico: "#ff3f3f",
      Exótico: "#00c3ff",
      "Sin rareza": "#333333",
    };
    return colors[rarity] || "#333333";
  };

  const convertPavosToSoles = (pavos) => (pavos * 0.015).toFixed(2);

  const generatePriceHTML = (price, originalPrice, vbuckIcon) =>
    `<p class="vbucks-container">
      <img class="vbuck-icon" src="${vbuckIcon}" alt="Pavos">
      ${
        originalPrice > price
          ? `<span class="original-price" style="text-decoration: line-through;">${originalPrice}</span>`
          : ""
      }
      <b>${price} - S/${convertPavosToSoles(price)} Soles</b>
    </p>`;

  const generateCardHTML = (item, vbuckIcon, extraClass = "") => {
    return `<div class="card ${extraClass}" style="background: ${
      item.background
    }" ${item.rarity ? `data-rarity="${item.rarity}"` : ""} data-name="${
      item.name
    }" data-price="${item.price}" data-soles="${convertPavosToSoles(
      item.price
    )}">
      <div class="card-image-container">
        ${
          item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}">` : ""
        }
      </div>
      <div class="card-body">
        <h3>${item.name}</h3>
        ${generatePriceHTML(item.price, item.originalPrice, vbuckIcon)}
      </div>
    </div>`;
  };

  const generateMessage = () =>
    currentItemData
      ? `Hola, me interesa el ${currentItemData.name}. Precio: ${currentItemData.price} paVos, S/${currentItemData.soles} Soles.`
      : "";

  const fetchShopData = async () => {
    const response = await fetch(
      "https://fortnite-api.com/v2/shop?language=es"
    );
    if (!response.ok) throw new Error("Error en la petición de la tienda");
    return response.json();
  };

  const processEntries = (entries) => {
    const setsMap = new Map();
    const processedIds = new Set();
    let tracksGroup = null;

    entries.forEach((entry) => {
      const isTrack =
        (entry.difficulty !== undefined && entry.artist) ||
        (entry.tracks && entry.tracks.length > 0);
      const setName =
        entry.section ||
        entry.layout?.name ||
        (isTrack ? "Pistas de improvisación" : "General");

      if (!setsMap.has(setName))
        setsMap.set(setName, { items: [], bundles: [] });
      const setData = setsMap.get(setName);

      if (entry.layout?.name === "Komodo") {
        setData.bundles.push({
          name: "Okapi",
          image:
            "https://fortnite-api.com/images/cosmetics/br/newdisplayassets/393ad0c760454fd2/renderimage_0.png",
          price: entry.finalPrice,
          originalPrice: entry.regularPrice,
          background: entry.colors
            ? `linear-gradient(45deg, #${entry.colors.color1}, #${entry.colors.color3})`
            : "#333333",
        });
      } else if (entry.bundle) {
        const bundleBackground = entry.colors
          ? `linear-gradient(45deg, #${entry.colors.color1}, #${entry.colors.color3})`
          : getRarityColor("Épico");
        setData.bundles.push({
          name: entry.bundle.name,
          image: entry.newDisplayAsset?.renderImages?.[0]?.image || "",
          price: entry.finalPrice,
          originalPrice: entry.regularPrice,
          discount: entry.banner?.value,
          items:
            entry.brItems?.map((item) => ({
              name: item.name,
              type: item.type?.displayValue,
              image:
                item.images?.featured ||
                item.images?.icon ||
                item.images?.smallIcon ||
                "",
            })) || [],
          background: bundleBackground,
        });
      } else if (
        !isTrack &&
        Array.isArray(entry.brItems) &&
        entry.brItems.length > 0
      ) {
        entry.brItems.forEach((item) => {
          if (
            !processedIds.has(item.id) &&
            !setData.items.some((existing) => existing.name === item.name)
          ) {
            processedIds.add(item.id);
            const background = entry.colors
              ? `linear-gradient(45deg, #${entry.colors.color1}, #${entry.colors.color3})`
              : getRarityColor(item.rarity?.displayValue);
            setData.items.push({
              id: item.id,
              name: item.name,
              type: item.type?.displayValue,
              rarity: item.rarity?.displayValue,
              price: entry.finalPrice,
              originalPrice: entry.regularPrice,
              imageUrl:
                item.images?.icon ||
                item.images?.featured ||
                item.images?.smallIcon ||
                "",
              background,
              isTrack: false,
            });
          }
        });
      } else if (
        isTrack &&
        (entry.albumArt || (entry.tracks && entry.tracks.length > 0))
      ) {
        const trackInfo = entry.albumArt ? entry : entry.tracks[0];
        setData.items.push({
          id: entry.id,
          name: trackInfo.title || entry.title,
          artist: trackInfo.artist || entry.artist,
          album: trackInfo.album || entry.album || "",
          releaseYear: trackInfo.releaseYear || entry.releaseYear,
          bpm: trackInfo.bpm || entry.bpm,
          duration: trackInfo.duration || entry.duration,
          imageUrl: trackInfo.albumArt,
          background: "#444",
          isTrack: true,
          price: entry.finalPrice,
          originalPrice: entry.regularPrice,
        });
      }
    });

    if (setsMap.has("Pistas de improvisación")) {
      tracksGroup = setsMap.get("Pistas de improvisación");
      setsMap.delete("Pistas de improvisación");
    }

    return { setsMap, tracksGroup };
  };

  const renderShopHTML = (setsMap, tracksGroup, vbuckIcon) => {
    let html = "";
    setsMap.forEach((setData, setName) => {
      html += `<section class="shop-section"><h2 class="section-title">${setName}</h2>`;
      if (setData.bundles.length > 0) {
        html += `<div class="bundles-container"><div class="bundles-grid">`;
        html += setData.bundles
          .map((bundle) => {
            return `<div class="card bundle-card" style="background: ${
              bundle.background
            }" data-name="${bundle.name}" data-price="${
              bundle.price
            }" data-soles="${convertPavosToSoles(bundle.price)}">
                      <div class="card-image-container">
                        ${
                          bundle.image
                            ? `<img src="${bundle.image}" alt="${bundle.name}">`
                            : ""
                        }
                      </div>
                      <div class="card-body">
                        <h3>${bundle.name}</h3>
                        <div class="bundle-items">
                          ${
                            bundle.items
                              ? bundle.items
                                  .map(
                                    (item) =>
                                      `<div class="bundle-item">
                                        ${
                                          item.image
                                            ? `<img src="${item.image}" alt="${item.name}">`
                                            : ""
                                        }
                                        <div class="item-info"><h4>${
                                          item.name
                                        }</h4></div>
                                      </div>`
                                  )
                                  .join("")
                              : ""
                          }
                        </div>
                        ${generatePriceHTML(
                          bundle.price,
                          bundle.originalPrice,
                          vbuckIcon
                        )}
                      </div>
                    </div>`;
          })
          .join("");
        html += `</div></div>`;
      }
      if (setData.items.length > 0) {
        html += `<div class="cards-grid">`;
        html += setData.items
          .map((item) => generateCardHTML(item, vbuckIcon))
          .join("");
        html += `</div>`;
      }
      html += `</section>`;
    });

    if (tracksGroup && tracksGroup.items.length > 0) {
      const limit = 8;
      const visibleTracks = tracksGroup.items.slice(0, limit);
      const hiddenTracks = tracksGroup.items.slice(limit);
      html += `<section class="shop-section"><h2 class="section-title">Pistas de improvisación</h2>
               <div class="cards-grid" id="tracks-visible">`;
      html += visibleTracks
        .map((item) => generateCardHTML(item, vbuckIcon, "track-card"))
        .join("");
      html += `</div>`;
      if (hiddenTracks.length > 0) {
        html += `<div class="cards-grid" id="tracks-hidden" style="display: none;">`;
        html += hiddenTracks
          .map((item) => generateCardHTML(item, vbuckIcon, "track-card"))
          .join("");
        html += `</div>
                 <div class="show-more-container">
                   <button id="show-more-tracks" class="show-more-button">
                     <i class="fa fa-chevron-down"></i>
                   </button>
                 </div>`;
      }
      html += `</section>`;
    }
    return html;
  };

  const setupObservers = () => {
    const observerThreshold = window.innerWidth < 768 ? 0.1 : 0.2;
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: observerThreshold, rootMargin: "0px 0px 300px 0px" }
    );
    document
      .querySelectorAll(".card")
      .forEach((card) => observer.observe(card));
  };

  const setupShowMoreButton = () => {
    const showMoreButton = document.getElementById("show-more-tracks");
    if (showMoreButton) {
      showMoreButton.addEventListener("click", () => {
        const hiddenTracksDiv = document.getElementById("tracks-hidden");
        if (hiddenTracksDiv.style.display === "none") {
          hiddenTracksDiv.style.display = "grid";
          showMoreButton.innerHTML = `<i class="fa fa-chevron-up"></i>`;
        } else {
          hiddenTracksDiv.style.display = "none";
          showMoreButton.innerHTML = `<i class="fa fa-chevron-down"></i>`;
        }
      });
    }
  };

  const setupModal = () => {
    const modal = document.getElementById("preview-modal");
    const closeModal = document.getElementById("close-modal");

    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () => {
        currentItemData = {
          name: card.getAttribute("data-name"),
          price: card.getAttribute("data-price"),
          soles: card.getAttribute("data-soles"),
        };
        modal.style.display = "flex";
      });
    });

    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
    });
    window.addEventListener("click", (event) => {
      if (event.target === modal) modal.style.display = "none";
    });
  };

  const applySoloCardClass = () => {
    document.querySelectorAll(".cards-grid").forEach((grid) => {
      const cards = grid.querySelectorAll(".card");
      if (cards.length === 1) {
        cards[0].classList.add("solo-card");
      }
    });
  };

  const setupSocialMediaListeners = () => {
    const whatsappIcon = document.getElementById("whatsapp-icon");
    if (whatsappIcon) {
      whatsappIcon.addEventListener("click", (e) => {
        e.preventDefault();
        const message = generateMessage();
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const url = isMobile
          ? "https://api.whatsapp.com/send?phone=51917932301&text=" +
            encodeURIComponent(message)
          : "https://wa.me/51917932301?text=" + encodeURIComponent(message);
        window.open(url, "_blank");
      });
    }

    const facebookIcon = document.getElementById("facebook-icon");
    if (facebookIcon) {
      facebookIcon.addEventListener("click", (e) => {
        e.preventDefault();
        const message = generateMessage();

        const url =
          "https://m.me/kidstore.pe?ref=" + encodeURIComponent(message);
        window.open(url, "_blank");
      });
    }

    const instagramIcon = document.getElementById("instagram-icon");
    if (instagramIcon) {
      instagramIcon.addEventListener("click", (e) => {
        e.preventDefault();
        const message = generateMessage();
        navigator.clipboard.writeText(message).then(() => {
          alert("Mensaje copiado al portapapeles:\n" + message);
          window.open("https://www.instagram.com/kidstore.peru/", "_blank");
        });
      });
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const data = await fetchShopData();
      const shopDiv = document.getElementById("shop");
      const entries =
        data?.data?.entries ?? (Array.isArray(data.data) ? data.data : []);
      if (!entries.length) {
        shopDiv.innerHTML = "<p>No se encontraron datos de la tienda.</p>";
        return;
      }
      const vbuckIcon = data.data.vbuckIcon || "";
      const { setsMap, tracksGroup } = processEntries(entries);
      shopDiv.innerHTML = renderShopHTML(setsMap, tracksGroup, vbuckIcon);

      applySoloCardClass();

      setupObservers();
      setupShowMoreButton();
      setupModal();
      setupSocialMediaListeners();
    } catch (error) {
      document.getElementById(
        "shop"
      ).innerHTML = `<p>Error: ${error.message}</p>`;
    }
  });
})();
