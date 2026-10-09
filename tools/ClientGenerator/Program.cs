using NJsonSchema;
using NJsonSchema.CodeGeneration;
using NJsonSchema.CodeGeneration.TypeScript;
using NSwag.CodeGeneration.TypeScript;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
namespace APIClientGenerator
{
    /// <summary>
    /// Generate TypeScript that matches ASP.NET C# Data Model names explicitly in swagger
    /// </summary>
    /// <see cref="https://github.com/RicoSuter/NSwag/issues/1874"/>
    /// APIClientGenerator section of <see cref="https://blog.logrocket.com/generate-typescript-csharp-clients-nswag-api/"/>
    /// <remarks>relies on nuget packages:
    /// dotnet add package NSwag.CodeGeneration.TypeScript
    /// dotnet add package NSwag.Core
    /// 
    /// .NET 7 Works with 13.20 but not 14.x
    /// .NET 10 works with nswag 14.6
    /// 
    /// 
    /// Lives in the spitfirepm repo under tools/ClientGenerator and is run through npm:
    ///     npm run swagger:update   refreshes swagger/v23.json from the dev site
    ///     npm run generate         regenerates src/SwaggerClients.ts from swagger/v23.json
    ///
    /// </remarks>
    ///
    class Program
    {
        static async Task Main(string[] args)
        {
            if (args.Length != 3)
            {
                Console.WriteLine("Expecting 3 arguments: swaggerSource, mode, generatePath\\fileName (.ts added) ");
                Console.WriteLine("swaggerSource is a path to a swagger/OpenAPI json file or an http(s) URL");
                Console.WriteLine("mode can be C for UpperCamel or s for As in Swagger   ");
                Environment.Exit((int)ExitCode.InvalidUsage);
                return;
            }

            var source = args[0];
            var mode = args[1];
            IPropertyNameGenerator UseNameGenerator;
            if (string.Compare(mode,"C",true) == 0)
            {
                UseNameGenerator = (IPropertyNameGenerator)new CustomUpperCamelCasePropertyNameGenerator();
            }
            else if (string.Compare(mode,"s",true) == 0)
            {
                UseNameGenerator = (IPropertyNameGenerator)new CustomRespectSwaggerPropertyNameGenerator();
            }
            else
            {
                Console.WriteLine("mode can be C for UpperCamel or s for As in Swagger   ");
                Environment.Exit((int)ExitCode.InvalidMode);
                UseNameGenerator = null;
                return;
            }
            var OutputPath = Path.Combine(Directory.GetCurrentDirectory(), args[2]);

            NSwag.OpenApiDocument document;
            var isUrl = source.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                     || source.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
            if (isUrl)
            {
                document = await NSwag.OpenApiDocument.FromUrlAsync(source);
            }
            else
            {
                var sourcePath = Path.Combine(Directory.GetCurrentDirectory(), source);
                if (!File.Exists(sourcePath))
                {
                    Console.WriteLine($"Swagger file not found: {sourcePath}");
                    Environment.Exit((int)ExitCode.InvalidFilename);
                    return;
                }
                document = await NSwag.OpenApiDocument.FromFileAsync(sourcePath);
            }

            // sfPMS actions that return HttpResponseMessage are documented as application/octet-stream
            // (string/binary) but answer JSON.  The JQueryPromises template parsed every 2xx body as
            // JSON and typed the result any; the Fetch template would instead resolve a
            // FileResponse { data: Blob }.  Keep the established contract until the controllers
            // declare their real response types (see docs/modernization/FINDINGS.md).
            foreach (var operationDescription in document.Operations)
            {
                foreach (var response in operationDescription.Operation.Responses.Values)
                {
                    if (response.Content.Count == 1
                        && response.Content.TryGetValue("application/octet-stream", out var octetStream)
                        && (octetStream.Schema == null || octetStream.Schema.Format == "binary"))
                    {
                        response.Content.Remove("application/octet-stream");
                        response.Content["application/json"] = new NSwag.OpenApiMediaType { Schema = new JsonSchema() };
                    }
                }
            }

            var sortedPaths = document.Paths.OrderBy(p => p.Key).ToList();
            document.Paths.Clear();
            foreach (var path in sortedPaths)
            {
                document.Paths.Add(path.Key, path.Value);
            }

            // 2. Sort the Data Models (Schemas)
            var sortedSchemas = document.Definitions.OrderBy(d => d.Key).ToList();
            document.Definitions.Clear();
            foreach (var schema in sortedSchemas)
            {
                document.Definitions.Add(schema.Key, schema.Value);
            }


            var settings = new NSwag.CodeGeneration.TypeScript.TypeScriptClientGeneratorSettings
            {
                ClassName = "{controller}Client",
                Template = TypeScriptTemplate.Fetch,  // was JQueryPromises; APIClientBase supplies transformOptions/transformResult
                PromiseType = PromiseType.Promise,
                HttpClass = HttpClass.HttpClient,
                WithCredentials = false,
                UseSingletonProvider = false,
                InjectionTokenType = InjectionTokenType.OpaqueToken,
                RxJsVersion = 6.0M,
                GenerateClientClasses = true,
                GenerateClientInterfaces = false,
                WrapDtoExceptions = false,
                GenerateOptionalParameters = true,
                ExceptionClass = "ApiException",
                ClientBaseClass = "APIClientBase",
                WrapResponses = false,
                WrapResponseMethods = Array.Empty<string>(),
                GenerateResponseClasses = true,
                ResponseClass = "SwaggerResponse",
                ProtectedMethods = Array.Empty<string>(),
                ExcludedParameterNames = Array.Empty<string>(),
                ConfigurationClass = "",
                UseTransformOptionsMethod = true,   // APIClientBase.transformOptions applies beforeSend hooks
                UseTransformResultMethod = true,
                ImportRequiredTypes = true,
                UseGetBaseUrlMethod = true,
                //BaseUrlTokenName = "API_BASE_URL", // angular
                QueryNullValue = "",
                UseAbortSignal = false, // option: fetch supports it; would add a trailing signal? parameter to every endpoint
                //serviceHost = null,
                //serviceSchemes= null,
                //output = "src/SwaggerClients.ts",
                //newLineBehavior = "Auto"

                TypeScriptGeneratorSettings =
                {
                    TypeScriptVersion = 6.0M,
                    //propertyNameGeneratorType= null,  
                    PropertyNameGenerator = UseNameGenerator,
                    DateTimeType =  TypeScriptDateTimeType.Date,
                    NullValue  = TypeScriptNullValue.Undefined,
                    ExportTypes= true,
                    
                    //operationGenerationMode = "MultipleClientsFromOperationId",
                    MarkOptionalProperties = true,
                    GenerateCloneMethod=  true,
                    TypeStyle =  TypeScriptTypeStyle.Interface, /* eliminates es2022 compatibility issues with new ClassName (because classes are gone!) */
                    EnumStyle = TypeScriptEnumStyle.Enum ,
                    UseLeafType = false,
                    ClassTypes=  Array.Empty<string>(),
                    ExtendedClasses = Array.Empty<string>(),
                    ExtensionCode =  "import { APIClientBase } from './APIClientBase';",
                    GenerateDefaultValues = true,
                    ExcludedTypeNames= Array.Empty<string>(),
                    HandleReferences=  false,
                    GenerateConstructorInterface = true,
                    ConvertConstructorInterfaceData = false,
                    InlineNamedAny = false,
                    InlineNamedDictionaries= false,
                    TemplateDirectory = null
                    //typeNameGeneratorType = null,
                    //enumNameGeneratorType= null,
                }
            };



            var resolver = new TypeScriptTypeResolver(settings.TypeScriptGeneratorSettings);
            var generator = new NSwag.CodeGeneration.TypeScript.TypeScriptClientGenerator(document, settings, resolver);
            var client = generator.GenerateFile();

            // Always LF with one trailing newline, so the committed file is identical whether the
            // generator runs on Windows (Environment.NewLine is CRLF) or Linux.
            client = client.Replace("\r\n", "\n");
            if (!client.EndsWith("\n")) client += "\n";
            File.WriteAllText(OutputPath + ".ts", client);


        }

    }


    enum ExitCode : int
    {
        Success = 0,
        InvalidUsage = 1,
        InvalidFilename = 2,
        InvalidMode = 4,
        UnknownError = 10
    }
}
// the name generator
/// <summary>
/// Custom property name generator to not have underscores in the name
/// </summary>
public class CustomUpperCamelCasePropertyNameGenerator : IPropertyNameGenerator
{
    /// <summary>Generates the property name.</summary>
    /// <param name="property">The property.</param>
    /// <returns>The new name.</returns>
    string IPropertyNameGenerator.Generate(JsonSchemaProperty property)
    {
        return ConversionUtilities.ConvertToUpperCamelCase(property.Name.Replace('_', '-')
            .Replace("@", "")
            .Replace(".", "-"), true);
    }
}
public class CustomRespectSwaggerPropertyNameGenerator : IPropertyNameGenerator
{
    /// <summary>Generates the property name.</summary>
    /// <param name="property">The property.</param>
    /// <returns>The new name.</returns>
    string IPropertyNameGenerator.Generate(JsonSchemaProperty property)
    {
        return property.Name.Replace('_', '_')
            .Replace("@", "")
            .Replace(".", "-") ;
    }
}