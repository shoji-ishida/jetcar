var Loader = function(zipURL, callback) {

    var zipReader = null;
    var zipEntries = null;
    var loaderCallback = callback;
    var manifest = null;
    var xmlDom = null;
    var scripts = [];
    var htmls = [];
    
    zip.createReader(new zip.HttpReader(zipURL), function(reader) {
        zipReader = reader; 
        zipReader.getEntries(function(entries) {
            zipEntries = entries;
            processManifest();
        });
    }, onerror);

    function processManifest() {
    	manifest = getEntry("manifest");
    	if (manifest) {
    		console.log("Process manifest");
    		manifest.getData(new zip.TextWriter(), function(xml) {
        		var parser = new DOMParser();
       			xmlDom = parser.parseFromString(xml, 'text/xml');
       			if(xmlDom.getElementsByTagName("parsererror").length){
       				xmlDom = null;
       				return;
       			}
       			loadHTMLs();
    		});
    	} else {
    		console.log("Can't find manifest");
    		if (loaderCallback) loaderCallback();
    	}
    }
    
    // This only works for Safari & Chrome.
    // Do not use <html> tab in manifest yet.
    function loadHTMLs() {
    	console.log("Process HTML");
    	var html = xmlDom.querySelector("html > file");
    	while (html) {
    		htmls.push(html.childNodes[0].nodeValue);
   	        html = html.nextElementSibling;
    	}
    	if (htmls.length != 0) {
    		loadHTML();
    	} else {
    		loadScripts();
    	}
    }
    
    function loadHTML() {
    	loader.loadHTML(htmls[0], htmlLoaded);
    }
    
    function htmlLoaded() {
    	htmls.shift();
    	if (scripts.length == 0) {
    		loadScripts();
    	} else {
    		loadHTML();
    	}
    };
    
    function loadScripts() {
   		var script = xmlDom.querySelector("script > file");

   		while (script) {
   			//console.log("src="+script.childNodes[0].nodeValue);
   			scripts.push(script.childNodes[0].nodeValue);
   	        script = script.nextElementSibling;
        }
   		if (scripts.length != 0) {
   			loadScript();
   		} else {
   			bootstrap();
   		}
    };
    
    function loadScript() {
    	loader.loadScript(scripts[0], scriptsLoaded);
    };

    function scriptsLoaded() {
    	//console.log("Loaded = " + scripts[0]);
    	scripts.shift();
    	if (scripts.length == 0) {
    		bootstrap();
    	} else {
    		loadScript();
    	}
    };
    
    function bootstrap() {
    	var bootstrap = xmlDom.querySelector("loader > bootstrap");
    	if (bootstrap) {
    		eval(bootstrap.childNodes[0].nodeValue);
    	}
    	if (loaderCallback) loaderCallback();
    }
    
    function onerror(message) {
        console.error(message);
    }

    function getEntry(filename) {
        for (var i = 0, len = zipEntries.length; i < len; i++) {
            if (zipEntries[i].filename == filename) {
                return zipEntries[i];
            }
        }
        return null;
    }
    
    function appendChild(node, text) {
        if (null === node.canHaveChildren || node.canHaveChildren) {
            node.appendChild(document.createTextNode(text));
        } else {
            node.text = text;
        }
    }
    
    function getFileExtension(filename) {
        return (/[.]/.exec(filename)) && /[^.]+$/.exec(filename)[0] || '';
    }

    return {
        close : function() {
            zipReader.close(function() {
                zipReader = null;
            });
            zipEntries = null;
        },
        loadHTML : function(url, callback) {
        	console.log("loadHTML: "+url);
        	var html = getEntry(url);
        	if (html) {
        		html.getData(new zip.TextWriter(), function(data) {
        			console.log(data);
        			document.write(data);
        			if (callback) callback();
        		});
        	}
        },
    	loadImage : function(url, callback) {
    		var entry = getEntry(url);
            if (entry) {
                var mime = null;
                switch(getFileExtension(url).toLowerCase()) {
                    case 'gif' :
                        mime = "image/gif";
                        break;
                    case 'png' :
                        mime = "image/png";
                        break;
                    case 'jpg':
                    case 'jpeg':
                        mime = "image/jpeg";
                        break;
                }
                if (mime != null) {
                    entry.getData(new zip.Data64URIWriter(mime), function(data) {
                	    callback(data);
                    });
                }
            }
        },
        loadCSS : function(url, callback) {
            var entry = getEntry(url);
            if (entry) {
            	entry.getData(new zip.TextWriter(), function(data) {
                var pa= document.getElementsByTagName('head')[0];
                var el= document.createElement('style');
                el.type= 'text/css';
                el.media= 'screen';
                if(el.styleSheet) el.styleSheet.cssText = data;// IE method
                else el.appendChild(document.createTextNode(data));// others
                pa.appendChild(el);
                if (callback) callback();
            	});
            }
        },
        loadScript : function(url, callback, encoding) {
        	console.log("loadScript: "+url);

        	var entry = getEntry(url);

            if (entry) {
            	entry.getData(new zip.TextWriter(), function(data) {
                var fileRef = window.document.createElement("script");
                fileRef.setAttribute("type", "text/javascript");
    		    fileRef.setAttribute("charset", encoding);

                var head = document.getElementsByTagName("head")[0] || document.documentElement;
                head.insertBefore(fileRef, head.firstChild);
                appendChild(fileRef, data);
                if (callback) callback();
            	});
            }
        }
    }


};
