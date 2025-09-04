(ns transplate.core
  "Core translation functions for template languages."
  (:require
   [clojure.spec.alpha :as s]))

(s/def :template/language #{:nunjucks :ejs :handlebars :liquid :mustache :pug})

(s/def :translate/from :template/language)
(s/def :translate/to :template/language)
(s/def :translate/input string?)

(s/def :translate/args (s/keys :req-un [:translate/from :translate/to :translate/input]))

(defn translate
  "Core translation function. Takes ClojureScript data with keyword keys.
  
  Takes a map with keys:
    :from - source template language (:nunjucks :ejs :handlebars :liquid :mustache :pug)
    :to   - target template language (same options as :from)
    :input - template string to translate
  
  Returns the translated template string."
  [args]
  (when-not (s/valid? :translate/args args)
    (s/explain :translate/args args)
    (throw (ex-info "Invalid arguments" {})))
  (str "<!-- Translated from " (name (:from args))
       " to " (name (:to args)) " -->\n"
       (:input args)))

