(ns transplate.interop
  "JavaScript interop wrapper for transplate.core functions."
  (:require [transplate.core :as core]))

(defn- validate-js-args!
  "Validates JavaScript arguments with user-friendly errors."
  [args]
  (when-not (:from args)
    (throw (js/Error. "Invalid argument \"from\": expected string (e.g., \"nunjucks\")")))
  (when-not (:to args)
    (throw (js/Error. "Invalid argument \"to\": expected string (e.g., \"mustache\")")))
  (when-not (:input args)
    (throw (js/Error. "Invalid argument \"input\": expected string (the template content)")))
  (when-not (string? (:from args))
    (throw (js/Error. "Invalid argument \"from\": expected string (e.g., \"nunjucks\")")))
  (when-not (string? (:to args))
    (throw (js/Error. "Invalid argument \"to\": expected string (e.g., \"mustache\")")))
  (when-not (string? (:input args))
    (throw (js/Error. "Invalid argument \"input\": expected string (the template content)"))))

(defn translate
  "Translate between template languages."
  [args]
  (let [clj-args (if (and args (not (map? args)))
                   (js->clj args :keywordize-keys true)
                   args)]
    (validate-js-args! clj-args)
    (core/translate (-> clj-args
                        (update :from keyword)
                        (update :to keyword)))))
