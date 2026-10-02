//listen on page load
$(document).ready(function() {

    loadCountry();




    //load and display all the counties
    function loadCountry() {
        loadProducts();
        loadProductCategory();
        loadImportPurpose();
        document.getElementById("import_description").innerHTML = "";

        var options = ""
        var url = serverURL + "countries/countryList?pageNo=0&pageSize=100000";

        var async_status = true;
        controller.getRequest(url, async_status, function(data, status) {

            options += "<option value =''>-Select Country-</option>";
            options += controller.loadSelect(data, 'country_id', 'name', '');
            $('#country_ID').html(options);
        });
    }

    loadProducts();



    //load and display all the counties
    function loadProducts() {
        var options = ""
        var url = serverURL + "product/productList?pageNo=0&pageSize=10000";
        var async_status = true;
        controller.getRequest(url, async_status, function(data, status) {
            options += "<option value =''>-Select Product-</option>";
            options += controller.loadSelect(data, 'products_id', 'name', '');
            $('#products_id').html(options);
        });
    }

    loadProductCategory();

    function loadProductCategory() {
        var options = ""
        var url = serverURL + "productForm/productFormList?pageNo=0&pageSize=100000";
        var async_status = true;
        controller.getRequest(url, async_status, function(data, status) {
            options += "<option value =''>-Select  Commodity Form-</option>";
            options += controller.loadSelect(data, 'product_form_id', 'name', '');
            $('#product_form_id').html(options);
        });
    }

    loadImportPurpose();

    function loadImportPurpose() {
        var options = ""
        var url = serverURL + "importPurpose/importPurposeList";
        var async_status = true;
        controller.getRequest(url, async_status, function(data, status) {
            options += "<option value =''>-Select Import Purpose-</option>";
            options += controller.loadSelect(data, 'importPurposeID', 'name', '');
            $('#importPurposeID').html(options);


        });
    }
    // stop the form from submitting normally 
    $('.ui.form.segment').submit(function(e) {
        //e.preventDefault(); usually use this, but below works best here.
        return false;
    });


});

function loadRequirements() {
    controller.show_progress();
    var postedFormData = $("#mainForm").serializeObject();
    var country_ID = $.trim($("#country_ID").val());

    //we create the main object that will store the form values for posting
    var mainDetails = new Object();
    //user details
    mainDetails.country_id = postedFormData.country_id;
    mainDetails.product_form_id = postedFormData.product_form_id;
    mainDetails.import_purpose_id = postedFormData.import_purpose_id;
    mainDetails.products_id = postedFormData.products_id;


    var formData = JSON.stringify(mainDetails);
    var url = serverURL + "importRequirement/getImportRequirements?country_id=" + country_ID + "&product_form_id=" + postedFormData.product_form_id + "&products_id=" + postedFormData.products_id + "&import_purpose_id=" + postedFormData.importPurposeID;


    //post the form data
    $.ajax({
        url: url,
        async: true,
        type: 'GET',
        contentType: "application/json",
        // data: formData,
        success: function(data, textStatus, xhr) {
            controller.hide_progress();


            if (xhr.status == 200) {
                if (data == null) {
                    document.getElementById("import_description").innerHTML = "No Requirements Found.";
                } else {
                    var desc = data[0].description;
                    var descBreakdown = desc.split('.')
                    var descr = ''
                    for (let i = 0; i < descBreakdown.length; i++) {

                        descr += '<li>' + descBreakdown[i] + '</li>';

                    }
                    document.getElementById("import_description").innerHTML = '<ol>' + descr + '</ol>';
                }
            } else if (xhr.status == 400) {
                var t = xhr.responseText;
                var obj = JSON.parse(t);
                document.getElementById("import_description").innerHTML = obj.data;

            }



        },
        fail: function(xhr, textStatus) {
            if (xhr.status == 400) {
                var t = xhr.responseText;
                var obj = JSON.parse(t);
                // document.getElementById('import_description').style.display = 'none';
                document.getElementById("import_description").innerHTML = obj.data;

            }
            controller.hide_progress();

        },
        error: function(xhr, textStatus) {
            controller.hide_progress();

            if (xhr.status == 400) {
                var t = xhr.responseText;
                var obj = JSON.parse(t);
                // document.getElementById('import_description').style.display = 'none';
                document.getElementById("import_description").innerHTML = obj.data;

            }
            // document.getElementById("import_description").innerHTML = "Fetching Requirements Failed";
        }
    });
}