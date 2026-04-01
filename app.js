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
      calendarTitle: "Keerthana's Mehendi",
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
  var RETURN_STATE_KEY = "keerthanaWeddingReturnState";
  var RETURN_STATE_MAX_AGE = 30 * 60 * 1000;

  var state = {
    envelopeOpened: false,
    musicOn: true,
    heroInView: true,
    navigatingAway: false
  };
  var pendingMusicUnlock = false;

  function trackEvent(name, params) {
    if (typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", name, params || {});
  }

  function clearStoredReturnState() {
    try {
      window.sessionStorage.removeItem(RETURN_STATE_KEY);
    } catch (error) {}
  }

  function readStoredReturnState() {
    try {
      var rawValue = window.sessionStorage.getItem(RETURN_STATE_KEY);
      if (!rawValue) {
        return null;
      }

      var savedState = JSON.parse(rawValue);
      if (!savedState || typeof savedState !== "object") {
        clearStoredReturnState();
        return null;
      }

      if (!savedState.pendingReturn || !savedState.envelopeOpened) {
        clearStoredReturnState();
        return null;
      }

      if (typeof savedState.savedAt !== "number" || Date.now() - savedState.savedAt > RETURN_STATE_MAX_AGE) {
        clearStoredReturnState();
        return null;
      }

      return savedState;
    } catch (error) {
      clearStoredReturnState();
      return null;
    }
  }

  function getMediaTime(media) {
    if (!media || typeof media.currentTime !== "number" || !isFinite(media.currentTime) || media.currentTime < 0) {
      return 0;
    }

    return media.currentTime;
  }

  function saveReturnState(pendingReturn) {
    if (!state.envelopeOpened) {
      clearStoredReturnState();
      return;
    }

    try {
      window.sessionStorage.setItem(RETURN_STATE_KEY, JSON.stringify({
        envelopeOpened: true,
        musicOn: state.musicOn,
        pendingReturn: !!pendingReturn,
        audioTime: getMediaTime(backgroundMusic),
        videoTime: getMediaTime(weddingVideo),
        scrollY: window.scrollY || window.pageYOffset || 0,
        savedAt: Date.now()
      }));
    } catch (error) {}
  }

  function restoreMediaPosition(media, targetTime) {
    if (!media || typeof targetTime !== "number" || !isFinite(targetTime) || targetTime < 0) {
      return;
    }

    function applyTime() {
      try {
        var nextTime = Math.max(targetTime, 0);

        if (isFinite(media.duration) && media.duration > 0) {
          nextTime = Math.min(nextTime, Math.max(media.duration - 0.1, 0));
        }

        media.currentTime = nextTime;
        return true;
      } catch (error) {
        return false;
      }
    }

    if (media.readyState >= 1 && applyTime()) {
      return;
    }

    function handleLoadedMetadata() {
      media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      applyTime();
    }

    media.addEventListener("loadedmetadata", handleLoadedMetadata);
  }

  function updateHeroInViewState() {
    var rect = weddingSection.getBoundingClientRect();
    state.heroInView = rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3;
  }

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

  function removeMusicUnlockRetry() {
    if (!pendingMusicUnlock) {
      return;
    }

    pendingMusicUnlock = false;
    document.removeEventListener("touchstart", handleMusicUnlockRetry);
    document.removeEventListener("click", handleMusicUnlockRetry);
  }

  function queueMusicUnlockRetry() {
    if (pendingMusicUnlock) {
      return;
    }

    pendingMusicUnlock = true;
    document.addEventListener("touchstart", handleMusicUnlockRetry, { passive: true });
    document.addEventListener("click", handleMusicUnlockRetry);
  }

  function handleMusicUnlockRetry() {
    removeMusicUnlockRetry();

    if (!state.envelopeOpened || state.navigatingAway || document.hidden || !state.musicOn) {
      return;
    }

    syncMusicPlayback();
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
      removeMusicUnlockRetry();
      pauseMedia(backgroundMusic);
      return;
    }

    backgroundMusic.volume = 1;
    playMedia(backgroundMusic)
      .then(function () {
        removeMusicUnlockRetry();
      })
      .catch(function () {
        queueMusicUnlockRetry();
      });
  }

  function syncMedia() {
    syncVideoPlayback();
    syncMusicPlayback();
  }

  function restoreReturnedState() {
    state.navigatingAway = false;
    navDim.classList.remove("active");
    clearStoredReturnState();
    syncMedia();
  }

  function restoreInvitationFromState(savedState) {
    state.envelopeOpened = true;
    state.musicOn = savedState.musicOn !== false;
    state.navigatingAway = false;

    envelope.classList.add("opening");
    envelopeScreen.classList.add("hidden");
    mainContent.classList.add("visible");
    soundToggle.classList.add("visible");
    navDim.classList.remove("active");
    setSoundButton();
    document.documentElement.classList.remove("returning-invite");

    if (typeof savedState.scrollY === "number" && isFinite(savedState.scrollY)) {
      window.scrollTo(0, Math.max(savedState.scrollY, 0));
    }

    updateHeroInViewState();

    if (backgroundMusic) {
      backgroundMusic.preload = "auto";
      restoreMediaPosition(backgroundMusic, savedState.audioTime);
    }

    if (weddingVideo) {
      restoreMediaPosition(weddingVideo, savedState.videoTime);
    }

    syncMedia();
    hideScrollHint();
    clearStoredReturnState();
  }

  function openInvitation() {
    var burstDelay = PREFERS_REDUCED_MOTION ? 80 : 180;
    var letterReleaseDelay = PREFERS_REDUCED_MOTION ? 40 : 260;
    var transitionDelay = PREFERS_REDUCED_MOTION ? 120 : 520;
    var revealDelay = PREFERS_REDUCED_MOTION ? 220 : 820;
    var cleanupDelay = PREFERS_REDUCED_MOTION ? 420 : 1480;

    if (state.envelopeOpened) {
      return;
    }

    state.envelopeOpened = true;
    envelope.classList.remove("letter-raised");
    envelope.classList.add("opening");
    envelopeScreen.classList.add("is-opening");
    document.documentElement.classList.remove("returning-invite");
    clearStoredReturnState();
    trackEvent("invitation_open", {
      source: "envelope"
    });

    if (weddingVideo) {
      weddingVideo.muted = true;
      playMedia(weddingVideo).catch(function () {});
    }

    setTimeout(function () {
      goldenBurst.classList.add("active");
    }, burstDelay);

    setTimeout(function () {
      envelope.classList.add("letter-raised");
    }, letterReleaseDelay);

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
    saveReturnState(true);
    try {
      var externalWindow = window.open(url, "_blank");

      if (externalWindow) {
        externalWindow.opener = null;

        setTimeout(function () {
          if (!document.hidden && state.navigatingAway) {
            restoreReturnedState();
          }
        }, 700);
        return;
      }
    } catch (error) {}

    setTimeout(function () {
      window.location.href = url;
    }, 260);
  }

  function buildDirectionsUrl(eventData) {
    var destination = eventData.lat + "," + eventData.lng;

    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination);
  }

  function buildCalendarUrl(eventData) {
    var start = new Date(eventData.date);
    var end = new Date(start.getTime() + eventData.duration * 3600000);
    var location = eventData.venue + ", " + eventData.address;

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
        trackEvent("directions_click", {
          invite_event: button.dataset.event
        });
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
        trackEvent("calendar_click", {
          invite_event: button.dataset.event
        });
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
        updateHeroInViewState();
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

  var savedReturnState = readStoredReturnState();

  envelope.addEventListener("click", openInvitation);
  envelope.addEventListener("keydown", handleEnvelopeKey);

  soundToggle.addEventListener("click", function () {
    state.musicOn = !state.musicOn;
    setSoundButton();
    trackEvent("music_toggle", {
      state: state.musicOn ? "on" : "off"
    });
    syncMusicPlayback();
  });

  document.querySelectorAll(".studio-link").forEach(function (link) {
    link.addEventListener("click", function () {
      trackEvent("instagram_click", {
        destination: "pixora24"
      });
    });
  });

  document.addEventListener("visibilitychange", function () {
    if (!state.envelopeOpened) {
      return;
    }

    if (document.hidden) {
      if (state.navigatingAway) {
        saveReturnState(true);
      }
      pauseMedia(weddingVideo);
      pauseMedia(backgroundMusic);
      return;
    }

    restoreReturnedState();
  });

  window.addEventListener("pageshow", function (event) {
    if (!state.envelopeOpened) {
      return;
    }

    if (event.persisted || state.navigatingAway) {
      restoreReturnedState();
    }
  });

  window.addEventListener("focus", function () {
    if (!state.envelopeOpened || document.hidden) {
      return;
    }

    restoreReturnedState();
  });

  window.addEventListener("pagehide", function () {
    if (!state.envelopeOpened || !state.navigatingAway) {
      return;
    }

    saveReturnState(true);
  });

  window.addEventListener("scroll", hideScrollHint, { passive: true });

  if (weddingVideo) {
    weddingVideo.preload = "auto";
    weddingVideo.load();
  }

  if (savedReturnState) {
    restoreInvitationFromState(savedReturnState);
  }

  bindActionButtons();
  bindRevealObserver();
  bindHeroObserver();
  updateHeroInViewState();
  hideScrollHint();
  setSoundButton();
})();
