var l = (navigator.language || "es").slice(0, 2);
location.replace(["ca", "en", "es"].indexOf(l) > -1 ? "/" + l + "/" : "/en/");
