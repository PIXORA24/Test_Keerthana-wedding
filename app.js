(function () {
  "use strict";

  var EVENTS = {
    wedding: {
      title: "Wedding Ceremony",
      calendarTitle: "Keerthana and Shravan Wedding",
      date: "2026-04-10T11:41:00+05:30",
      duration: 4,
      venue: "Shubhalaxmi Auditorium",
      address: "Benjanpadav, Bantwal, Karnataka 574219",
      lat: 12.904474613001197,
      lng: 74.97528888025847
    },
    mehendi: {
      title: "Mehendi Ceremony",
      calendarTitle: "Keerthana and Shravan Mehendi",
      date: "2026-04-08T19:30:00+05:30",
      duration: 5,
      venue: "Kalpavraksha House",
      address: "Pallamajal Kallagudde, Bantwal",
      lat: 12.89118259617451,
      lng: 75.00963868137455
    },
    reception: {
      title: "Reception",
      calendarTitle: "Keerthana and Shravan Reception",
      date: "2026-04-11T11:00:00+05:30",
      duration: 5,
      venue: "Kalpavraksha House",
      address: "Pallamajal Kallagudde, Bantwal",
      lat: 12.89118259617451,
      lng: 75.00963868137455
    }
  };

  var IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var PREFERS_REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var envelopeScreen = document.getElementById("envelopeScreen");
  var envelope = document.getElementById("envelope");
  var goldenBurst = document.getElementById("goldenBurst");
  var introTransition = document.getElementById("introTransition");
  var navDim = document.getElementById("navDim");
  var mainContent = document.getElementById("mainContent");
  var weddingSection = document.getElementById("weddingSection");
  var weddingVideo = document.getElementById("weddingVideo");
  var backgroundMusic = document.getElementById("bgMusic");
  var soundToggle = document.getElementById("soundToggle");
  var soundToggleLabel = soundToggle.querySelector(".sound-btn__label");
  var scrollHint = document.getElementById("scrollHint");

  var state = {
    envelopeOpened: false,
    musicOn: true,
    heroInView: true,
    navigatingAway: false
  };

  function formatUtcDate(date) {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  function playMedia(media) {
    try {
      var result = media.play();
      if (result && typeof result.then === "function") {
        return result;
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function pauseMedia(media) {
    if (media) {
      media.pause();
    }
  }

  function setSoundButton() {
    soundToggle.classList.toggle("is-muted", !state.musicOn);
    soundToggleLabel.textContent = state.musicOn ? "Music on" : "Music off";
    soundToggle.setAttribute("aria-label", state.musicOn ? "Turn music off" : "Turn music on");
  }

  function syncVideoPlayback() {
    if (!state.envelopeOpened || state.navigatingAway || document.hidden) {
      return;
    }

    if (!state.heroInView) {
      pauseMedia(weddingVideo);
      return;
    }

    weddingVideo.muted = true;
    playMedia(weddingVideo).catch(function () {});
  }

  function syncMusicPlayback() {
    if (!state.envelopeOpened || state.navigatingAway || document.hidden) {
      return;
    }

    if (!state.musicOn) {
      pauseMedia(backgroundMusic);
      return;
    }

    backgroundMusic.volume = 1;
    playMedia(backgroundMusic).catch(function () {
      state.musicOn = false;
      setSoundButton();
    });
  }

  function syncMedia() {
    syncVideoPlayback();
    syncMusicPlayback();
  }

  function openInvitation() {
    var burstDelay = PREFERS_REDUCED_MOTION ? 80 : 180;
    var transitionDelay = PREFERS_REDUCED_MOTION ? 120 : 520;
    var revealDelay = PREFERS_REDUCED_MOTION ? 220 : 820;
    var cleanupDelay = PREFERS_REDUCED_MOTION ? 420 : 1480;

    if (state.envelopeOpened) {
      return;
    }

    state.envelopeOpened = true;
    envelope.classList.add("opening");
    envelopeScreen.classList.add("is-opening");

    if (backgroundMusic) {
      backgroundMusic.load();
    }

    weddingVideo.load();

    setTimeout(function () {
      goldenBurst.classList.add("active");
    }, burstDelay);

    setTimeout(function () {
      introTransition.classList.add("active");
    }, transitionDelay);

    setTimeout(function () {
      envelopeScreen.classList.add("hidden");
      mainContent.classList.add("visible");
      soundToggle.classList.add("visible");
      setSoundButton();
      syncMedia();
    }, revealDelay);

    setTimeout(function () {
      goldenBurst.classList.remove("active");
    }, revealDelay + 80);

    setTimeout(function () {
      introTransition.classList.remove("active");
    }, cleanupDelay);
  }

  function handleEnvelopeKey(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openInvitation();
  }

  function hideScrollHint() {
    scrollHint.classList.toggle("is-hidden", window.scrollY > 48);
  }

  function navigateWithFade(url) {
    if (state.navigatingAway) {
      return;
    }

    state.navigatingAway = true;
    navDim.classList.add("active");
    pauseMedia(weddingVideo);
    pauseMedia(backgroundMusic);

    setTimeout(function () {
      window.location.href = url;
    }, 260);
  }

  function buildDirectionsUrl(eventData) {
    var destination = eventData.lat + "," + eventData.lng;

    if (IS_IOS) {
      return "maps://maps.apple.com/?daddr=" + destination;
    }

    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination);
  }

  function buildCalendarUrl(eventData) {
    var start = new Date(eventData.date);
    var end = new Date(start.getTime() + eventData.duration * 3600000);
    var location = eventData.venue + ", " + eventData.address;

    if (IS_IOS) {
      var ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Wedding Invite//EN",
        "BEGIN:VEVENT",
        "DTSTART:" + formatUtcDate(start),
        "DTEND:" + formatUtcDate(end),
        "SUMMARY:" + eventData.calendarTitle,
        "LOCATION:" + location,
        "DESCRIPTION:" + eventData.title + " - " + eventData.venue,
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");

      var blob = new Blob([ics], { type: "text/calendar" });
      var blobUrl = URL.createObjectURL(blob);

      setTimeout(function () {
        URL.revokeObjectURL(blobUrl);
      }, 60000);

      return blobUrl;
    }

    return "https://calendar.google.com/calendar/render?action=TEMPLATE"
      + "&text=" + encodeURIComponent(eventData.calendarTitle)
      + "&dates=" + formatUtcDate(start) + "/" + formatUtcDate(end)
      + "&details=" + encodeURIComponent(eventData.title + " at " + eventData.venue)
      + "&location=" + encodeURIComponent(location);
  }

  function bindActionButtons() {
    document.querySelectorAll(".map-btn").forEach(function (button) {
      var eventData = EVENTS[button.dataset.event];

      if (!eventData) {
        return;
      }

      var url = buildDirectionsUrl(eventData);
      button.href = url;

      button.addEventListener("click", function (event) {
        event.preventDefault();
        navigateWithFade(url);
      });
    });

    document.querySelectorAll(".cal-btn").forEach(function (button) {
      var eventData = EVENTS[button.dataset.event];

      if (!eventData) {
        return;
      }

      button.addEventListener("click", function (event) {
        event.preventDefault();
        navigateWithFade(buildCalendarUrl(eventData));
      });
    });
  }

  function bindRevealObserver() {
    if (PREFERS_REDUCED_MOTION || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (element) {
        element.classList.add("visible");
      });
      return;
    }

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.18 });

    document.querySelectorAll(".reveal").forEach(function (element) {
      revealObserver.observe(element);
    });
  }

  function bindHeroObserver() {
    if (!("IntersectionObserver" in window)) {
      window.addEventListener("scroll", function () {
        var rect = weddingSection.getBoundingClientRect();
        state.heroInView = rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3;
        syncVideoPlayback();
      }, { passive: true });
      return;
    }

    var heroObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        state.heroInView = entry.intersectionRatio >= 0.28;
        syncVideoPlayback();
      });
    }, { threshold: [0, 0.28, 0.5] });

    heroObserver.observe(weddingSection);
  }

  envelope.addEventListener("click", openInvitation);
  envelope.addEventListener("keydown", handleEnvelopeKey);

  soundToggle.addEventListener("click", function () {
    state.musicOn = !state.musicOn;
    setSoundButton();
    syncMusicPlayback();
  });

  document.addEventListener("visibilitychange", function () {
    if (!state.envelopeOpened) {
      return;
    }

    if (document.hidden) {
      pauseMedia(weddingVideo);
      pauseMedia(backgroundMusic);
      return;
    }

    syncMedia();
  });

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted || !state.envelopeOpened) {
      return;
    }

    state.navigatingAway = false;
    navDim.classList.remove("active");
    syncMedia();
  });

  window.addEventListener("focus", function () {
    if (!state.envelopeOpened || state.navigatingAway || document.hidden) {
      return;
    }

    syncMedia();
  });

  window.addEventListener("scroll", hideScrollHint, { passive: true });

  bindActionButtons();
  bindRevealObserver();
  bindHeroObserver();
  hideScrollHint();
  setSoundButton();
})();
