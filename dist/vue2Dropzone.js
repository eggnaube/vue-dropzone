(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.vue2Dropzone = factory());
}(this, (function () { 'use strict';

var awsEndpoint = {
  getSignedURL: function getSignedURL(file, endpoint, headers) {
    var payload = {
      filePath: file.name,
      contentType: file.type
    };

    return new Promise(function (resolve, reject) {
      var request = new XMLHttpRequest();
      request.open("POST", endpoint);
      request.onload = function () {
        if (request.status == 200) {
          resolve(JSON.parse(request.response));
        } else {
          reject((request.statusText));
        }
      };
      request.onerror = function (err) {
        console.error("Network Error : Could not send request to AWS (Maybe CORS errors)");
        reject(err);
      };
      Object.entries(headers).forEach(function (ref) {
        var name = ref[0];
        var value = ref[1];

        request.setRequestHeader(name, value);
      });
      request.send();
    });
  },
  sendFile: function sendFile(file, endpoint, headers) {
    var fd = new FormData();
    return this.getSignedURL(file, endpoint, headers)
      .then(function (response) {
        var signature = response.signature;
        Object.keys(signature).forEach(function (key) {
          if (key == 'key') {
            fd.append('key', file.name);
          } else if (key == 'Content-Type') {
            fd.append("Content-Type", file.type);
          } else {
            fd.append(key, signature[key]);
          }
        });
        fd.append('file', file);
        return new Promise(function (resolve, reject) {
          var request = new XMLHttpRequest();
          request.open('POST', response.postEndpoint);
          request.onload = function () {
            if (request.status == 201) {
              var s3Error = (new window.DOMParser()).parseFromString(request.response, "text/xml");
              var successMsg = s3Error.firstChild.children[0].innerHTML;
              resolve({
                'success': true,
                'message': successMsg
              });
            } else {
              var s3Error = (new window.DOMParser()).parseFromString(request.response, "text/xml");
              var errMsg = s3Error.firstChild.children[0].innerHTML;
              reject({
                'success': false,
                'message': errMsg + ". Request is marked as resolved when returns as status 201"
              });
            }
          };
          request.onerror = function (err) {
            var s3Error = (new window.DOMParser()).parseFromString(request.response, "text/xml");
            var errMsg = s3Error.firstChild.children[1].innerHTML;
            reject({
              'success': false,
              'message': errMsg
            });
          };
          request.send(fd);
        });
      })
      .catch(function (error) {
        return error;
      });
  }
};

var vueDropzone$1 = {render: function(){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{ref:"dropzoneElement",class:{ 'vue-dropzone dropzone': _vm.includeStyling },attrs:{"id":_vm.id}})},staticRenderFns: [],
  props: {
    id: {
      type: String,
      required: true
    },
    options: {
      type: Object,
      required: true
    },
    includeStyling: {
      type: Boolean,
      default: true,
      required: false
    },
    awss3: {
      type: Object,
      required: false,
      default: null
    },
    destroyDropzone: {
      type: Boolean,
      default: true,
      required: false
    }
  },
  data: function data() {
    return {
      isS3: false,
      wasQueueAutoProcess: true,
    }
  },
  computed: {
    dropzoneSettings: function dropzoneSettings() {
      var defaultValues = {
        thumbnailWidth: 200,
        thumbnailHeight: 200
      };
      Object.keys(this.options).forEach(function(key) {
        defaultValues[key] = this.options[key];
      }, this);
      if (this.awss3 !== null) {
        defaultValues['autoProcessQueue'] = false;
        this.isS3 = true;
        if (this.options.autoProcessQueue !== undefined)
          { this.wasQueueAutoProcess = this.options.autoProcessQueue; }
      }
      return defaultValues
    }
  },
  methods: {
    manuallyAddFile: function(file, fileUrl) {
      var this$1 = this;

      file.manuallyAdded = true;
      this.dropzone.emit("addedfile", file);
      this.dropzone.emit("thumbnail", file, fileUrl);

      var thumbnails = file.previewElement.querySelectorAll('[data-dz-thumbnail]');
      for (var i = 0; i < thumbnails.length; i++) {
        thumbnails[i].style.width = this$1.dropzoneSettings.thumbnailWidth + 'px';
        thumbnails[i].style.height = this$1.dropzoneSettings.thumbnailHeight + 'px';
        thumbnails[i].style['object-fit'] = 'contain';
      }
      this.dropzone.emit("complete", file);
      if (this.dropzone.options.maxFiles) { this.dropzone.options.maxFiles--; }
      this.dropzone.files.push(file);
      this.$emit('vdropzone-file-added-manually', file);
    },
    setOption: function(option, value) {
      this.dropzone.options[option] = value;
    },
    removeAllFiles: function(bool) {
      this.dropzone.removeAllFiles(bool);
    },
    processQueue: function() {
      var this$1 = this;

      var dropzoneEle = this.dropzone;
      if (this.isS3 && !this.wasQueueAutoProcess) {
        this.getQueuedFiles().forEach(function (file) {
          this$1.getSignedAndUploadToS3(file);
        });
      } else {
        this.dropzone.processQueue();
      }
      this.dropzone.on("success", function() {
        dropzoneEle.options.autoProcessQueue = true;
      });
      this.dropzone.on('queuecomplete', function() {
        dropzoneEle.options.autoProcessQueue = false;
      });
    },
    init: function() {
      return this.dropzone.init();
    },
    destroy: function() {
      return this.dropzone.destroy();
    },
    updateTotalUploadProgress: function() {
      return this.dropzone.updateTotalUploadProgress();
    },
    getFallbackForm: function() {
      return this.dropzone.getFallbackForm();
    },
    getExistingFallback: function() {
      return this.dropzone.getExistingFallback();
    },
    setupEventListeners: function() {
      return this.dropzone.setupEventListeners();
    },
    removeEventListeners: function() {
      return this.dropzone.removeEventListeners();
    },
    disable: function() {
      return this.dropzone.disable();
    },
    enable: function() {
      return this.dropzone.enable();
    },
    filesize: function(size) {
      return this.dropzone.filesize(size);
    },
    accept: function(file, done) {
      return this.dropzone.accept(file, done);
    },
    addFile: function(file) {
      return this.dropzone.addFile(file);
    },
    removeFile: function(file) {
      this.dropzone.removeFile(file);
    },
    getAcceptedFiles: function() {
      return this.dropzone.getAcceptedFiles()
    },
    getRejectedFiles: function() {
      return this.dropzone.getRejectedFiles()
    },
    getFilesWithStatus: function() {
      return this.dropzone.getFilesWithStatus()
    },
    getQueuedFiles: function() {
      return this.dropzone.getQueuedFiles()
    },
    getUploadingFiles: function() {
      return this.dropzone.getUploadingFiles()
    },
    getAddedFiles: function() {
      return this.dropzone.getAddedFiles()
    },
    getActiveFiles: function() {
      return this.dropzone.getActiveFiles()
    },
    getSignedAndUploadToS3: function getSignedAndUploadToS3(file) {
      var this$1 = this;

      awsEndpoint.sendFile(file, this.awss3.signingURL, this.awss3.headers)
        .then(function (response) {
          if (response.success) {
            file.s3ObjectLocation = response.message;
            setTimeout(function () { return this$1.dropzone.processFile(file); });
            this$1.$emit('vdropzone-s3-upload-success', response.message);
          } else {
            if ('undefined' !== typeof message) {
              this$1.$emit('vdropzone-s3-upload-error', response.message);
            } else {
              this$1.$emit('vdropzone-s3-upload-error', "Network Error : Could not send request to AWS. (Maybe CORS error)");
            }
          }
        })
        .catch(function (error) {
          alert(error);
        });
    },
    setAWSSigningURL: function setAWSSigningURL(location) {
      if (this.isS3) {
        this.awss3.signingURL = location;
      }
    }
  },
  mounted: function mounted() {
    if (this.$isServer && this.hasBeenMounted) {
      return
    }
    this.hasBeenMounted = true;
    var Dropzone = require('dropzone'); //eslint-disable-line
    Dropzone.autoDiscover = false;
    this.dropzone = new Dropzone(this.$refs.dropzoneElement, this.dropzoneSettings);
    var vm = this;

    this.dropzone.on('thumbnail', function(file, dataUrl) {
      vm.$emit('vdropzone-thumbnail', file, dataUrl);
    });

    this.dropzone.on('addedfile', function(file) {
      if (vm.duplicateCheck) {
        if (this.files.length) {
          this.files.forEach(function(dzfile) {
            if (dzfile.name === file.name) {
              this.removeFile(file);
              vm.$emit('duplicate-file', file);
            }
          }, this);
        }
      }
      vm.$emit('vdropzone-file-added', file);
      if (vm.isS3 && vm.wasQueueAutoProcess) {
        vm.getSignedAndUploadToS3(file);
      }
    });

    this.dropzone.on('addedfiles', function(files) {
      vm.$emit('vdropzone-files-added', files);
    });

    this.dropzone.on('removedfile', function(file) {
      vm.$emit('vdropzone-removed-file', file);
      if (file.manuallyAdded) { vm.dropzone.options.maxFiles++; }
    });

    this.dropzone.on('success', function(file, response) {
      vm.$emit('vdropzone-success', file, response);
      if (vm.isS3 && vm.wasQueueAutoProcess) {
        vm.setOption('autoProcessQueue', false);
      }
    });

    this.dropzone.on('successmultiple', function(file, response) {
      vm.$emit('vdropzone-success-multiple', file, response);
    });

    this.dropzone.on('error', function(file, message, xhr) {
      vm.$emit('vdropzone-error', file, message, xhr);
    });

    this.dropzone.on('errormultiple', function(files, message, xhr) {
      vm.$emit('vdropzone-error-multiple', files, message, xhr);
    });

    this.dropzone.on('sending', function(file, xhr, formData) {
      if (vm.isS3)
        { formData.append('s3ObjectLocation', file.s3ObjectLocation); }
      vm.$emit('vdropzone-sending', file, xhr, formData);
    });

    this.dropzone.on('sendingmultiple', function(file, xhr, formData) {
      vm.$emit('vdropzone-sending-multiple', file, xhr, formData);
    });

    this.dropzone.on('complete', function(file) {
      vm.$emit('vdropzone-complete', file);
    });

    this.dropzone.on('completemultiple', function(files) {
      vm.$emit('vdropzone-complete-multiple', files);
    });

    this.dropzone.on('canceled', function(file) {
      vm.$emit('vdropzone-canceled', file);
    });

    this.dropzone.on('canceledmultiple', function(files) {
      vm.$emit('vdropzone-canceled-multiple', files);
    });

    this.dropzone.on('maxfilesreached', function(files) {
      vm.$emit('vdropzone-max-files-reached', files);
    });

    this.dropzone.on('maxfilesexceeded', function(file) {
      vm.$emit('vdropzone-max-files-exceeded', file);
    });

    this.dropzone.on('processing', function(file) {
      vm.$emit('vdropzone-processing', file);
    });

    this.dropzone.on('processing', function(file) {
      vm.$emit('vdropzone-processing', file);
    });

    this.dropzone.on('processingmultiple', function(files) {
      vm.$emit('vdropzone-processing-multiple', files);
    });

    this.dropzone.on('uploadprogress', function(file, progress, bytesSent) {
      vm.$emit('vdropzone-upload-progress', file, progress, bytesSent);
    });

    this.dropzone.on('totaluploadprogress', function(totaluploadprogress, totalBytes, totalBytesSent) {
      vm.$emit('vdropzone-total-upload-progress', totaluploadprogress, totalBytes, totalBytesSent);
    });

    this.dropzone.on('reset', function() {
      vm.$emit('vdropzone-reset');
    });

    this.dropzone.on('queuecomplete', function() {
      vm.$emit('vdropzone-queuecomplete');
    });

    this.dropzone.on('drop', function(event) {
      vm.$emit('vdropzone-drop', event);
    });

    this.dropzone.on('dragstart', function(event) {
      vm.$emit('vdropzone-drag-start', event);
    });

    this.dropzone.on('dragend', function(event) {
      vm.$emit('vdropzone-drag-end', event);
    });

    this.dropzone.on('dragenter', function(event) {
      vm.$emit('vdropzone-drag-enter', event);
    });

    this.dropzone.on('dragover', function(event) {
      vm.$emit('vdropzone-drag-over', event);
    });

    this.dropzone.on('dragleave', function(event) {
      vm.$emit('vdropzone-drag-leave', event);
    });

    vm.$emit('vdropzone-mounted');
  },
  beforeDestroy: function beforeDestroy() {
    if (this.destroyDropzone) { this.dropzone.destroy(); }
  }
};

return vueDropzone$1;

})));
//# sourceMappingURL=vue2Dropzone.js.map
