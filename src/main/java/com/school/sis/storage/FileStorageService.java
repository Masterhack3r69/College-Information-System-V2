package com.school.sis.storage;

import com.school.sis.common.exception.BusinessRuleException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {
    private static final Set<String> SAFE=Set.of("application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain","image/png","image/jpeg");
    private final Path materialRoot; private final Path formRoot; private final Path requestRoot;
    public FileStorageService(@Value("${sis.storage.material-root:uploads/materials}") String materials,
                              @Value("${sis.storage.form-root:uploads/forms}") String forms,
                              @Value("${sis.storage.request-root:uploads/requests}") String requests){
        materialRoot=Path.of(materials).toAbsolutePath().normalize(); formRoot=Path.of(forms).toAbsolutePath().normalize(); requestRoot=Path.of(requests).toAbsolutePath().normalize();
    }
    public Stored storeForm(MultipartFile file){return store(formRoot,file);}
    public Stored storeRequest(MultipartFile file){return store(requestRoot,file);}
    public byte[] readMaterial(String stored){return read(materialRoot,stored);}
    public byte[] readForm(String stored){return read(formRoot,stored);}
    public byte[] readRequest(String stored){return read(requestRoot,stored);}
    private Stored store(Path root,MultipartFile file){
        if(file==null||file.isEmpty()) throw new BusinessRuleException("A file is required");
        if(file.getSize()>10*1024*1024) throw new BusinessRuleException("File exceeds the 10 MB limit");
        if(!SAFE.contains(file.getContentType())) throw new BusinessRuleException("File type is not allowed");
        String original=Path.of(file.getOriginalFilename()==null?"file":file.getOriginalFilename()).getFileName().toString();
        String ext=original.contains(".")?original.substring(original.lastIndexOf('.')).replaceAll("[^A-Za-z0-9.]",""):"";
        String stored=UUID.randomUUID()+ext;
        try{Files.createDirectories(root);Path target=root.resolve(stored).normalize();if(!target.startsWith(root))throw new BusinessRuleException("Invalid file name");Files.copy(file.getInputStream(),target,StandardCopyOption.REPLACE_EXISTING);return new Stored(original,stored,file.getContentType(),file.getSize());}
        catch(IOException e){throw new BusinessRuleException("Unable to store file");}
    }
    private byte[] read(Path root,String stored){try{Path path=root.resolve(stored).normalize();if(!path.startsWith(root)||!Files.isRegularFile(path))throw new BusinessRuleException("File is unavailable");return Files.readAllBytes(path);}catch(IOException e){throw new BusinessRuleException("File is unavailable");}}
    public record Stored(String originalFilename,String storedFilename,String mimeType,long size){}
}
